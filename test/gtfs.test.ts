/**
 * Unit tests for GTFS route lookup and scheduled arrivals. No network access:
 * every test uses a tiny hand-made timetable.
 *
 * Run with:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveRouteIds, getScheduledArrivals } from '../src/gtfs.tools.js';

// Shaped like Rapid Penang's feed: route_id is an internal code and the bus
// number people know ("401") is route_short_name.
const feed = {
  routes: [
    { route_id: '30000019', route_short_name: '401' },
    { route_id: '30000051', route_short_name: 'CAT' },
  ],
  trips: [
    { trip_id: 't401', route_id: '30000019', service_id: 'daily' },
    { trip_id: 'tcat', route_id: '30000051', service_id: 'daily' },
    { trip_id: 'tlate', route_id: '30000019', service_id: 'daily' },
  ],
  stop_times: [
    { trip_id: 't401', stop_id: 'komtar', arrival_time: '14:10:00', departure_time: '14:10:00', stop_sequence: '1' },
    { trip_id: 'tcat', stop_id: 'komtar', arrival_time: '14:05:00', departure_time: '14:05:00', stop_sequence: '1' },
    // GTFS writes trips after midnight as 24+ hours: 25:15 is 01:15 the next morning
    { trip_id: 'tlate', stop_id: 'komtar', arrival_time: '25:15:00', departure_time: '25:15:00', stop_sequence: '1' },
  ],
  calendar: [{
    service_id: 'daily', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1',
    saturday: '1', sunday: '1', start_date: '20260101', end_date: '20271231',
  }],
  calendar_dates: [],
};

test('route filter accepts the bus number or the route_id', () => {
  assert.deepEqual([...resolveRouteIds(feed, '401')], ['30000019'], 'bus number');
  assert.deepEqual([...resolveRouteIds(feed, '30000019')], ['30000019'], 'internal route_id');
  assert.deepEqual([...resolveRouteIds(feed, ' cat ')], ['30000051'], 'case and spaces ignored');
  assert.equal(resolveRouteIds(feed, '999').size, 0, 'unknown route matches nothing');
});

test('scheduled arrivals are in Malaysia time and can be filtered by bus number', () => {
  // 14:00 on Sunday 22 Nov 2026 in Malaysia is 06:00 UTC
  const at = new Date('2026-11-22T06:00:00Z');

  const all = getScheduledArrivals(feed, 'komtar', 10, undefined, at);
  assert.deepEqual(all.map(a => a.scheduled_time), ['14:05', '14:10', '01:15']);

  const only401 = getScheduledArrivals(feed, 'komtar', 10, resolveRouteIds(feed, '401'), at);
  assert.deepEqual(only401.map(a => a.route_short_name), ['401', '401']);
  assert.equal(only401[0].minutes_until_arrival, 10);
});

test("a trip after midnight on yesterday's timetable still shows up", () => {
  // 00:30 on Monday 23 Nov 2026 in Malaysia (16:30 UTC on the 22nd): the 25:15 trip
  // from Sunday's timetable runs at 01:15 this morning, 45 minutes from now.
  const at = new Date('2026-11-22T16:30:00Z');
  const [first] = getScheduledArrivals(feed, 'komtar', 1, undefined, at);
  assert.equal(first.scheduled_time, '01:15');
  assert.equal(first.minutes_until_arrival, 45);
});
