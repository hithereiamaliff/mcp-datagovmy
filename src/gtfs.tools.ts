import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
// Default import on purpose: this package is CommonJS, and with `import * as` Node's ES-module
// loader only exposes `default`, so `transit_realtime` came out undefined and every realtime
// decode failed with "Cannot read properties of undefined (reading 'FeedMessage')".
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import JSZip from 'jszip';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { prefixToolName } from './utils/tool-naming.js';
import { API_BASE_URL } from './config.js';

// GTFS endpoints
// (There is no trip-update endpoint: data.gov.my returns 404 for /gtfs-realtime/trip-update/
// for every operator, so arrival times come from the static timetable instead.)
const GTFS_STATIC_ENDPOINT = '/gtfs-static';
const GTFS_REALTIME_ENDPOINT = '/gtfs-realtime/vehicle-position';

// Real-time data availability note
const REALTIME_DATA_NOTE = "Real-time data access through this MCP is limited. For up-to-date train and bus schedules, bus locations, and arrivals in real-time, please use these apps: Google Maps (Penang, Kuala Lumpur, Selangor, Putrajaya, Kuantan, Johor Bahru), MyRapid PULSE (Penang, Kuala Lumpur, Selangor, Putrajaya, Kuantan), Moovit (Penang, Kuala Lumpur, Selangor, Putrajaya, Kuantan, Johor Bahru), or Lugo (Johor Bahru).";

// Error note for 404 errors
const ERROR_404_NOTE = "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required.";

// Combined note for error responses
const COMBINED_ERROR_NOTE = `${ERROR_404_NOTE} ${REALTIME_DATA_NOTE}`;

// Geocoding API (Nominatim / OpenStreetMap — no API key required)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = 'Malaysia-Open-Data-MCP-Server/1.0 (+https://github.com/hithereiamaliff/mcp-datagovmy)';
const NOMINATIM_CONTACT_EMAIL = process.env.NOMINATIM_CONTACT_EMAIL?.trim();
const NOMINATIM_MIN_INTERVAL_MS = 1000;
const GEOCODE_CACHE_HIT_TTL_MS = 24 * 60 * 60 * 1000;
const GEOCODE_CACHE_MISS_TTL_MS = 60 * 60 * 1000;
// Keep at most this many remembered place lookups; the oldest are dropped first, so memory
// can't grow forever on a long-running public server.
const GEOCODE_CACHE_MAX_ENTRIES = 500;

type GeocodeResult = { lat: number; lon: number } | null;

// Valid providers and categories
const VALID_PROVIDERS = ['mybas-johor', 'ktmb', 'prasarana'];

// Valid categories for Prasarana (the ones data.gov.my actually publishes)
const PRASARANA_CATEGORIES = [
  'rapid-bus-penang',
  'rapid-bus-mrtfeeder',
  'rapid-rail-kl',
  'rapid-bus-kl'
];

// Categories data.gov.my no longer publishes at all (static and realtime both return 404).
// We still recognise them so people get a clear explanation instead of a confusing 404.
const UNPUBLISHED_PRASARANA_CATEGORIES: Record<string, string> = {
  'rapid-bus-kuantan': 'Rapid Kuantan buses',
};

// Feeds that have a static timetable but NO realtime vehicle-position feed (the API returns 404).
const NO_REALTIME_FEED: Record<string, string> = {
  'prasarana/rapid-rail-kl': 'Rapid KL rail (LRT, MRT and Monorail)',
};

// Common name mappings to help with user queries
const PROVIDER_MAPPINGS: Record<string, { provider: string; category?: string }> = {
  // Direct provider mappings
  'mybas': { provider: 'mybas-johor' },
  'mybas johor': { provider: 'mybas-johor' },
  'mybas johor bahru': { provider: 'mybas-johor' },
  'ktmb': { provider: 'ktmb' },
  'ktm': { provider: 'ktmb' },
  'keretapi tanah melayu': { provider: 'ktmb' },
  'keretapi tanah melayu berhad': { provider: 'ktmb' },
  'prasarana': { provider: 'prasarana', category: 'rapid-rail-kl' },
  
  // Prasarana services (mapped to provider + category)
  'rapid rail': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid rail kl': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid kl rail': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid-rail': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid-rail-kl': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'mrt': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'lrt': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'monorail': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'monorel': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'kl mrt': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'kl lrt': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'kl monorail': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'kl monorel': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid kl bus': { provider: 'prasarana', category: 'rapid-bus-kl' },
  'rapid bus kl': { provider: 'prasarana', category: 'rapid-bus-kl' },
  'rapid kl': { provider: 'prasarana', category: 'rapid-rail-kl' }, // Default to rail when just 'rapid kl' is specified
  'rapid penang': { provider: 'prasarana', category: 'rapid-bus-penang' },
  'rapid bus penang': { provider: 'prasarana', category: 'rapid-bus-penang' },
  'rapid kuantan': { provider: 'prasarana', category: 'rapid-bus-kuantan' },
  'rapid bus kuantan': { provider: 'prasarana', category: 'rapid-bus-kuantan' },
  'mrt feeder': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' },
  'rapid feeder': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' },
  'rapid feeder kl': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' },
  'rapid bus mrt feeder': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' }
};

/**
 * Normalize provider and category from user input
 * @param provider Provider name from user input
 * @param category Optional category from user input
 * @returns Normalized provider and category
 */
function normalizeProviderAndCategory(provider: string, category?: string): { provider: string; category?: string; error?: string } {
  // Convert to lowercase for case-insensitive matching
  const lowerProvider = provider.trim().toLowerCase();
  const explicitCategory = category?.trim().toLowerCase() || undefined;

  // A friendly name like "rapid penang" or "ktm" maps to an official provider (and maybe a default category)
  const alias = PROVIDER_MAPPINGS[lowerProvider];
  const resolvedProvider = alias ? alias.provider : lowerProvider;

  if (!VALID_PROVIDERS.includes(resolvedProvider)) {
    return {
      provider,
      category,
      error: `Invalid provider: ${provider}. Valid providers are: ${VALID_PROVIDERS.join(', ')}`
    };
  }

  // Only Prasarana has categories; other providers ignore any category given.
  if (resolvedProvider !== 'prasarana') {
    return { provider: resolvedProvider };
  }

  // WHY: a category the caller typed explicitly must win over the alias's default. Before, the
  // "prasarana" alias always forced rapid-rail-kl, so provider "prasarana" + category
  // "rapid-bus-penang" silently returned KL train data.
  const finalCategory = explicitCategory ?? alias?.category;
  if (!finalCategory) {
    return {
      provider: resolvedProvider,
      error: 'Category parameter is required for prasarana provider'
    };
  }

  if (UNPUBLISHED_PRASARANA_CATEGORIES[finalCategory]) {
    return {
      provider: resolvedProvider,
      category: finalCategory,
      error: `data.gov.my no longer publishes any GTFS feed (static timetable or realtime) for ${UNPUBLISHED_PRASARANA_CATEGORIES[finalCategory]} (prasarana/${finalCategory}). Available Prasarana categories: ${PRASARANA_CATEGORIES.join(', ')}`
    };
  }

  if (!PRASARANA_CATEGORIES.includes(finalCategory)) {
    return {
      provider: resolvedProvider,
      category,
      error: `Invalid category for prasarana: ${category}. Valid categories are: ${PRASARANA_CATEGORIES.join(', ')}`
    };
  }

  return { provider: resolvedProvider, category: finalCategory };
}

// Export geocoding functions for testing
export { geocodeLocation, geocodeWithNominatim, haversineDistance };

// Cache for GTFS data to avoid repeated downloads and parsing
const gtfsCache = {
  static: new Map<string, { data: Record<string, any[]>; timestamp: number }>(),
  realtime: new Map<string, { data: any; timestamp: number }>(),
};

// Downloads currently in progress, one per cache key. WHY: if several requests for the same
// feed arrive at once, they all wait for one download instead of each downloading and parsing
// their own copy (a parsed feed can take ~100 MB of memory).
const gtfsStaticInFlight = new Map<string, Promise<Record<string, any[]>>>();

// Cache expiry times (in milliseconds)
const STATIC_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const REALTIME_CACHE_EXPIRY = 30 * 1000; // 30 seconds

const geocodeCache = new Map<string, { result: GeocodeResult; timestamp: number }>();
const geocodeInFlight = new Map<string, Promise<GeocodeResult>>();
let nominatimRequestQueue: Promise<void> = Promise.resolve();
let lastNominatimRequestStartedAt = 0;

/**
 * Parse CSV data from a readable stream
 * @param stream Readable stream containing CSV data
 * @returns Promise resolving to an array of parsed objects
 */
async function parseCsv(stream: Readable): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    stream
      // Strip an invisible byte-order mark (U+FEFF) from header names (rapid-rail-kl's
      // stop_times.txt has one), otherwise the first column would not be named "route_id".
      .pipe(csvParser({ mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim() }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Parse GTFS Static data from a ZIP file
 * @param buffer Buffer containing the ZIP file
 * @returns Promise resolving to parsed GTFS data
 */
async function parseGtfsStaticZip(buffer: Buffer): Promise<Record<string, any[]>> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(buffer);
  const result: Record<string, any[]> = {};
  
  // List of core GTFS files to parse.
  // shapes.txt (route line geometry) is deliberately NOT loaded: no tool uses it, and it is one
  // of the largest files, so keeping it in the 24-hour cache only wasted memory.
  const coreFiles = [
    'agency.txt',
    'stops.txt',
    'routes.txt',
    'trips.txt',
    'stop_times.txt',
    'calendar.txt',
    'calendar_dates.txt',
    'frequencies.txt',
  ];
  
  // Parse each file in the ZIP
  for (const fileName of Object.keys(contents.files)) {
    // Skip directories and non-core files
    if (contents.files[fileName].dir || !coreFiles.includes(fileName)) {
      continue;
    }
    
    try {
      // Get file content as text
      const fileData = await contents.files[fileName].async('nodebuffer');
      const stream = Readable.from(fileData);
      
      // Parse CSV data
      const parsedData = await parseCsv(stream);
      
      // Store parsed data
      const fileNameWithoutExt = fileName.replace('.txt', '');
      result[fileNameWithoutExt] = parsedData;
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
    }
  }

  return result;
}

/**
 * Build a data.gov.my GTFS URL.
 * The path ends with "/" and the category goes in the query string with nothing after it.
 * (The old realtime code added an extra "/" at the very end, producing ".../ktmb//" or
 * "?category=rapid-bus-kl/", both of which the API rejects with 404.)
 */
function buildGtfsUrl(endpoint: string, provider: string, category?: string): string {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return `${API_BASE_URL}${endpoint}/${encodeURIComponent(provider)}/${query}`;
}

/**
 * Get the parsed static GTFS feed for an already-normalized provider/category, using the
 * 24-hour cache and sharing any download already in progress.
 */
async function loadGtfsStatic(
  provider: string,
  category: string | undefined,
  forceRefresh = false
): Promise<{ data: Record<string, any[]>; cached: boolean; timestamp: number }> {
  const cacheKey = `${provider}-${category || 'default'}`;
  const cached = gtfsCache.static.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
    return { data: cached.data, cached: true, timestamp: cached.timestamp };
  }

  let pending = gtfsStaticInFlight.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      // The URL is built from the SAME normalized values as the cache key, so the data stored
      // under a key always belongs to that provider/category.
      const response = await axios.get(buildGtfsUrl(GTFS_STATIC_ENDPOINT, provider, category), {
        responseType: 'arraybuffer',
      });
      const data = await parseGtfsStaticZip(Buffer.from(response.data));
      gtfsCache.static.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    })();
    gtfsStaticInFlight.set(cacheKey, pending);
    // Forget the in-progress marker when done, whether it worked or failed (failures aren't cached).
    pending.then(
      () => gtfsStaticInFlight.delete(cacheKey),
      () => gtfsStaticInFlight.delete(cacheKey)
    );
  }

  const data = await pending;
  return { data, cached: false, timestamp: gtfsCache.static.get(cacheKey)?.timestamp ?? Date.now() };
}

/**
 * Turn an upstream error body into readable text or JSON.
 * WHY: GTFS files are downloaded as raw bytes, so when the API replies with an error message
 * axios gives us bytes too, and printing them produced a long list of numbers instead of
 * the API's helpful message (e.g. which categories are valid).
 */
function decodeErrorBody(data: unknown): unknown {
  const bytes = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : null;
  if (!bytes) return data;
  const text = bytes.toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 500);
  }
}

// ---------------------------------------------------------------------------
// Scheduled arrivals from the static timetable.
// WHY: data.gov.my publishes no GTFS "trip-update" feed (that URL returns 404 for every
// operator), so live arrival predictions are impossible. We read the published timetable
// (stop_times + calendar) instead and clearly label the results as scheduled.
// ---------------------------------------------------------------------------

const SCHEDULED_ARRIVALS_LABEL = 'scheduled (no realtime trip-update feed is published)';
const WEEKDAY_COLUMNS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "25:10:00" or "6:00:00" -> seconds after the service day's midnight. GTFS allows hours of 24+ for trips running past midnight. */
function gtfsTimeToSeconds(value: string | undefined): number | null {
  if (!value) return null;
  const [h, m, s = 0] = value.trim().split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s) ? h * 3600 + m * 60 + s : null;
}

/** Seconds after midnight -> "HH:MM" on a 24-hour clock. */
function secondsToClock(seconds: number): string {
  const s = ((Math.round(seconds) % 86400) + 86400) % 86400;
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

/**
 * Today's date (YYYYMMDD), weekday and time of day in Malaysia.
 * Malaysia is UTC+8 all year (no daylight saving), so a fixed offset is correct even though
 * the server itself runs on UTC.
 */
function malaysiaClock(at: Date) {
  const local = new Date(at.getTime() + 8 * 60 * 60 * 1000);
  return {
    ymd: local.toISOString().slice(0, 10).replace(/-/g, ''),
    weekday: local.getUTCDay(),
    seconds: local.getUTCHours() * 3600 + local.getUTCMinutes() * 60 + local.getUTCSeconds(),
    label: `${local.toISOString().slice(0, 16).replace('T', ' ')} (Malaysia time, UTC+8)`,
  };
}

/** service_ids that run on a given day: calendar.txt weekly pattern plus calendar_dates.txt exceptions. null = the feed has no calendar, so assume every service runs. */
function activeServiceIds(gtfs: Record<string, any[]>, ymd: string, weekday: number): Set<string> | null {
  const calendar = gtfs.calendar || [];
  const exceptions = gtfs.calendar_dates || [];
  if (calendar.length === 0 && exceptions.length === 0) return null;
  const active = new Set<string>();
  for (const row of calendar) {
    const inDateRange = (!row.start_date || row.start_date <= ymd) && (!row.end_date || ymd <= row.end_date);
    if (inDateRange && row[WEEKDAY_COLUMNS[weekday]] === '1') active.add(row.service_id);
  }
  for (const row of exceptions) {
    if (row.date !== ymd) continue;
    if (row.exception_type === '1') active.add(row.service_id); // extra service on this date
    if (row.exception_type === '2') active.delete(row.service_id); // service cancelled on this date (e.g. public holiday)
  }
  return active;
}

/**
 * The route_ids that a route filter refers to.
 * WHY: people use the number shown on the bus or train ("401", "KJ"), which GTFS calls
 * route_short_name, but route_id can be an internal code. Rapid Penang's bus 401 is
 * route_id "30000019", so filtering on route_id alone found nothing. An exact route_id
 * match wins; otherwise the route number is matched. Both ignore upper/lower case.
 */
export function resolveRouteIds(gtfs: Record<string, any[]>, routeFilter: string): Set<string> {
  const wanted = routeFilter.trim().toLowerCase();
  const routes = gtfs.routes || [];
  const byId = routes.filter((r: any) => String(r.route_id ?? '').toLowerCase() === wanted);
  const matches = byId.length > 0
    ? byId
    : routes.filter((r: any) => String(r.route_short_name ?? '').toLowerCase() === wanted);
  return new Set(matches.map((r: any) => String(r.route_id)));
}

/** Result for a route filter that matches no route, listing some real route numbers. */
function unknownRouteResult(gtfs: Record<string, any[]>, routeFilter: string, feedLabel: string) {
  const routes = gtfs.routes || [];
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          message: `No route "${routeFilter}" in ${feedLabel}. Use a route number (route_short_name) or a route_id from get_transit_routes.`,
          example_routes: routes.map((r: any) => r.route_short_name || r.route_id).filter(Boolean).slice(0, 15),
          total_routes: routes.length,
        }, null, 2),
      },
    ],
  };
}

/**
 * Next scheduled arrivals at one stop, from now (Malaysia time) to the end of today's service.
 * Handles trips that run past midnight (a time like 25:10 on yesterday's service is 01:10 today)
 * and headway services in frequencies.txt (e.g. "every 5 minutes from 06:00 to 09:00").
 * routeIds (from resolveRouteIds) limits the result to those routes.
 */
export function getScheduledArrivals(gtfs: Record<string, any[]>, stopId: string, limit: number, routeIds?: Set<string>, at: Date = new Date()) {
  const now = malaysiaClock(at);
  const yesterday = malaysiaClock(new Date(at.getTime() - 24 * 60 * 60 * 1000));
  const serviceDays = [
    { services: activeServiceIds(gtfs, now.ymd, now.weekday), offset: 0 },
    { services: activeServiceIds(gtfs, yesterday.ymd, yesterday.weekday), offset: -86400 },
  ];
  const tripsById = new Map<string, any>((gtfs.trips || []).map((t: any) => [t.trip_id, t]));
  const atStop = (gtfs.stop_times || []).filter(
    (st: any) => st.stop_id === stopId && (!routeIds || routeIds.has(tripsById.get(st.trip_id)?.route_id))
  );

  // Headway-based trips: their stop_times are a template that repeats every headway_secs.
  const tripIdsAtStop = new Set(atStop.map((st: any) => st.trip_id));
  const frequencies = new Map<string, any[]>();
  for (const f of gtfs.frequencies || []) {
    if (!tripIdsAtStop.has(f.trip_id)) continue;
    const list = frequencies.get(f.trip_id) ?? [];
    list.push(f);
    frequencies.set(f.trip_id, list);
  }
  // For those trips we need the template's departure time from its first stop.
  const firstDeparture = new Map<string, { sequence: number; seconds: number }>();
  if (frequencies.size > 0) {
    for (const st of gtfs.stop_times || []) {
      if (!frequencies.has(st.trip_id)) continue;
      const sequence = Number(st.stop_sequence);
      const seconds = gtfsTimeToSeconds(st.departure_time || st.arrival_time);
      const current = firstDeparture.get(st.trip_id);
      if (seconds !== null && (!current || sequence < current.sequence)) firstDeparture.set(st.trip_id, { sequence, seconds });
    }
  }

  const found: Array<{ seconds: number; trip: any; frequencyBased: boolean }> = [];
  for (const st of atStop) {
    const trip = tripsById.get(st.trip_id);
    const stopSeconds = gtfsTimeToSeconds(st.arrival_time || st.departure_time);
    if (!trip || stopSeconds === null) continue;
    for (const day of serviceDays) {
      if (day.services && !day.services.has(trip.service_id)) continue;
      const freqRows = frequencies.get(st.trip_id);
      if (!freqRows) {
        const seconds = stopSeconds + day.offset;
        if (seconds >= now.seconds) found.push({ seconds, trip, frequencyBased: false });
        continue;
      }
      const first = firstDeparture.get(st.trip_id);
      if (!first) continue;
      const travel = stopSeconds - first.seconds; // time from the first stop to this stop
      for (const f of freqRows) {
        const start = gtfsTimeToSeconds(f.start_time);
        const end = gtfsTimeToSeconds(f.end_time);
        const headway = Number(f.headway_secs);
        if (start === null || end === null || !(headway > 0)) continue;
        // First departure from the first stop that still reaches this stop at or after "now"
        let k = Math.max(0, Math.ceil((now.seconds - day.offset - travel - start) / headway));
        for (let n = 0; n < limit && start + k * headway < end; n++, k++) {
          found.push({ seconds: start + k * headway + travel + day.offset, trip, frequencyBased: true });
        }
      }
    }
  }

  const routesById = new Map<string, any>((gtfs.routes || []).map((r: any) => [r.route_id, r]));
  return found
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, limit)
    .map(({ seconds, trip, frequencyBased }) => {
      const route = routesById.get(trip.route_id);
      return {
        trip_id: trip.trip_id,
        route_id: trip.route_id,
        route_short_name: route?.route_short_name,
        route_long_name: route?.route_long_name,
        trip_headsign: trip.trip_headsign || undefined,
        direction_id: trip.direction_id,
        scheduled_time: secondsToClock(seconds), // Malaysia time
        minutes_until_arrival: Math.round((seconds - now.seconds) / 60),
        // Headway services ("every N minutes") only promise a frequency, so these times are estimates
        frequency_based: frequencyBased || undefined,
      };
    });
}

/**
 * Enhance location query with Malaysian context if needed
 * @param query Original location query
 * @returns Enhanced query with better context for geocoding
 */
function enhanceLocationQuery(query: string): string {
  // Don't modify if already contains state/country information
  const malaysianStates = ['penang', 'pulau pinang', 'selangor', 'kuala lumpur', 'kl', 'johor', 'kedah', 'kelantan', 
                          'melaka', 'malacca', 'negeri sembilan', 'pahang', 'perak', 'perlis', 'sabah', 
                          'sarawak', 'terengganu', 'labuan', 'putrajaya'];
  
  // Check if query already contains state information
  const lowercaseQuery = query.toLowerCase();
  const hasStateInfo = malaysianStates.some(state => lowercaseQuery.includes(state));
  
  if (hasStateInfo || lowercaseQuery.includes('malaysia')) {
    return query; // Already has sufficient context
  }
  
  // Special handling for specific hotels in Penang
  const penangHotels = [
    'hompton hotel', 'cititel', 'g hotel', 'eastern & oriental', 'e&o hotel', 'shangri-la', 
    'shangri la', 'holiday inn', 'tune hotel', 'hotel jen', 'the light', 'lexis suites', 
    'hard rock hotel', 'bayview', 'equatorial', 'four points', 'vouk hotel', 'neo+', 'neo plus',
    'royale chulan', 'the wembley', 'sunway hotel', 'hotel royal', 'st giles', 'flamingo'
  ];
  
  // Check if query contains any Penang hotel names
  if (penangHotels.some(hotel => lowercaseQuery.includes(hotel))) {
    return `${query}, Penang, Malaysia`;
  }
  
  // Check for common hotel chains or landmarks that might need context
  if (lowercaseQuery.includes('hotel') || 
      lowercaseQuery.includes('mall') || 
      lowercaseQuery.includes('airport')) {
    
    // Check for Penang-specific locations
    if (lowercaseQuery.includes('bayan lepas') || 
        lowercaseQuery.includes('georgetown') || 
        lowercaseQuery.includes('george town') || 
        lowercaseQuery.includes('butterworth') ||
        lowercaseQuery.includes('bukit mertajam') ||
        lowercaseQuery.includes('batu ferringhi')) {
      return `${query}, Penang, Malaysia`;
    }
    
    // Add Malaysia as context to improve geocoding results
    return `${query}, Malaysia`;
  }
  
  return query;
}

/**
 * Geocode a location name to coordinates using Nominatim (OpenStreetMap)
 * @param query Location name to geocode
 * @param country Optional country code to limit results (e.g., 'my' for Malaysia)
 * @returns Promise with coordinates or null if not found
 */
async function geocodeLocation(query: string, country: string = 'my'): Promise<{ lat: number; lon: number } | null> {
  try {
    const enhancedQuery = enhanceLocationQuery(query);
    console.log('Geocoding with Nominatim');
    return await geocodeWithNominatim(enhancedQuery, query, country);
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Geocode using Nominatim API (OpenStreetMap)
 */
async function geocodeWithNominatim(enhancedQuery: string, originalQuery: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const enhancedResult = await lookupWithNominatim(enhancedQuery, country);
  if (enhancedResult) {
    return enhancedResult;
  }

  // If enhanced query failed and it was different from original, try the original
  if (enhancedQuery !== originalQuery) {
    console.log(`Enhanced query failed, trying original query with Nominatim: ${originalQuery}`);
    return lookupWithNominatim(originalQuery, country);
  }
  
  return null;
}

function createGeocodeCacheKey(query: string, country: string): string {
  return `${country.trim().toLowerCase()}::${query.trim().toLowerCase()}`;
}

function buildNominatimParams(query: string, country: string): URLSearchParams {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: country,
  });

  if (NOMINATIM_CONTACT_EMAIL) {
    params.set('email', NOMINATIM_CONTACT_EMAIL);
  }

  return params;
}

function getCachedGeocodeResult(cacheKey: string): GeocodeResult | undefined {
  const cached = geocodeCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  const ttl = cached.result ? GEOCODE_CACHE_HIT_TTL_MS : GEOCODE_CACHE_MISS_TTL_MS;
  if (Date.now() - cached.timestamp < ttl) {
    return cached.result;
  }

  geocodeCache.delete(cacheKey);
  return undefined;
}

function setCachedGeocodeResult(cacheKey: string, result: GeocodeResult): GeocodeResult {
  // Delete first so a refreshed entry moves to the "newest" end (a Map keeps insertion order)
  geocodeCache.delete(cacheKey);
  geocodeCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });
  // Drop the oldest entries once over the cap
  while (geocodeCache.size > GEOCODE_CACHE_MAX_ENTRIES) {
    const oldestKey = geocodeCache.keys().next().value;
    if (oldestKey === undefined) break;
    geocodeCache.delete(oldestKey);
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queueNominatimRequest<T>(request: () => Promise<T>): Promise<T> {
  const scheduled = nominatimRequestQueue.then(async () => {
    const waitTime = Math.max(
      0,
      NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimRequestStartedAt)
    );
    if (waitTime > 0) {
      await sleep(waitTime);
    }

    lastNominatimRequestStartedAt = Date.now();
    return request();
  });

  nominatimRequestQueue = scheduled.then(() => undefined, () => undefined);
  return scheduled;
}

async function lookupWithNominatim(query: string, country: string): Promise<GeocodeResult> {
  const cacheKey = createGeocodeCacheKey(query, country);
  const cached = getCachedGeocodeResult(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const inFlight = geocodeInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = queueNominatimRequest(async () => {
    const params = buildNominatimParams(query, country);
    console.log(`Geocoding with Nominatim API: "${query}"`);

    const response = await axios.get(`${NOMINATIM_API}?${params.toString()}`, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
      },
    });

    if (Array.isArray(response.data) && response.data.length > 0) {
      const result = response.data[0];
      console.log(`Nominatim found location: ${result.display_name}`);
      return setCachedGeocodeResult(cacheKey, {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      });
    }

    return setCachedGeocodeResult(cacheKey, null);
  });

  geocodeInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    geocodeInFlight.delete(cacheKey);
  }
}

/**
 * Calculate the Haversine distance between two points in kilometers
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  lat1 = toRadians(lat1);
  lat2 = toRadians(lat2);
  
  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in kilometers
  const R = 6371;
  
  // Return distance in kilometers
  return R * c;
}

/**
 * Register GTFS tools with the MCP server
 * @param server MCP server instance
 */
export function registerGtfsTools(server: McpServer) {
  // Parse GTFS Static data
  server.tool(
    prefixToolName('parse_gtfs_static'),
    'Parse GTFS Static data for a specific transport provider. Returns a summary (row counts, columns and a few sample rows per file); pass "file" with limit/offset to page through one file. IMPORTANT: For transit queries like "Show me routes from Rapid Penang", use get_transit_routes directly with the provider name. This is a low-level tool - prefer using get_transit_routes or get_transit_stops for most user queries.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      force_refresh: z.boolean().optional().describe('Force refresh the cache'),
      file: z.string().optional().describe('Optional: one GTFS file to page through, e.g. "stops", "routes", "trips", "stop_times", "calendar" (".txt" optional). Omit for a summary of all files.'),
      limit: z.number().int().min(1).max(500).optional().describe('Rows to return when "file" is given (default 50, max 500)'),
      offset: z.number().int().min(0).optional().describe('Rows to skip when "file" is given (default 0)'),
    },
    async ({ provider, category, force_refresh = false, file, limit = 50, offset = 0 }) => {
      // Normalize provider and category (done before "try" so the error handler can show the real URL)
      const normalized = normalizeProviderAndCategory(provider, category);
      try {
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Download (or reuse from cache) using the NORMALIZED provider/category, so common names
        // like "rapid penang" or "KTMB" work and the cache can't store one feed under another's name.
        const { data: gtfsData, cached, timestamp } = await loadGtfsStatic(normalized.provider, normalized.category, force_refresh);
        const feedLabel = `${normalized.provider}${normalized.category ? `/${normalized.category}` : ''}`;

        // Page through one file
        if (file) {
          const fileKey = file.trim().toLowerCase().replace(/\.txt$/, '');
          const rows = gtfsData[fileKey];
          if (!rows) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    message: `File "${file}" is not available for ${feedLabel}.`,
                    available_files: Object.keys(gtfsData).map(name => `${name}.txt`),
                    note: 'shapes.txt (route geometry) and non-core files are not loaded by this server.',
                  }, null, 2),
                },
              ],
            };
          }
          const page = rows.slice(offset, offset + limit);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Rows ${offset + 1}-${offset + page.length} of ${rows.length} from ${fileKey}.txt (${feedLabel})`,
                  file: `${fileKey}.txt`,
                  total_rows: rows.length,
                  offset,
                  limit,
                  has_more: offset + limit < rows.length,
                  rows: page,
                  cached,
                  timestamp,
                }, null, 2),
              },
            ],
          };
        }

        // Summary of every file. WHY: returning the whole feed produced up to ~97 MB of text
        // (rapid-bus-penang), far more than any AI client can accept.
        const files = Object.entries(gtfsData).map(([name, rows]) => ({
          file: `${name}.txt`,
          rows: rows.length,
          columns: rows.length > 0 ? Object.keys(rows[0]) : [],
          sample: rows.slice(0, 3),
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `GTFS static summary for ${feedLabel}${cached ? ' (from cache)' : ''}`,
                provider: normalized.provider,
                category: normalized.category,
                files,
                not_loaded: 'shapes.txt (route geometry) and non-core files are skipped to save memory.',
                how_to_page: 'Call again with file (e.g. "stops") plus limit/offset to read rows from one file.',
                cached,
                timestamp,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to parse GTFS static data',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: buildGtfsUrl(GTFS_STATIC_ENDPOINT, normalized.provider, normalized.category),
                response_data: responseData,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Parse GTFS Realtime data
  server.tool(
    prefixToolName('parse_gtfs_realtime'),
    'Parse GTFS Realtime data for a specific transport provider. IMPORTANT: For transit queries like "Show me bus locations from Rapid Penang", use this tool directly with the provider name. Common names like "rapid penang", "rapid kl bus", or "mybas johor" are automatically mapped to the correct provider-category pairs. Note: no realtime feed is published for Rapid KL rail (LRT/MRT/Monorail).',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      force_refresh: z.boolean().optional().describe('Force refresh the cache'),
      route_id: z.string().optional().describe('Only vehicles on this route (optional)'),
      limit: z.number().int().min(1).max(500).optional().describe('Maximum number of vehicles to return (default 50, max 500)'),
    },
    async ({ provider, category, force_refresh = false, route_id, limit = 50 }) => {
      // Normalize provider and category (done before "try" so the error handler can show the real URL)
      const normalized = normalizeProviderAndCategory(provider, category);
      try {
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }

        // Use normalized values
        const normalizedProvider = normalized.provider;
        const normalizedCategory = normalized.category;

        // Some feeds have a timetable but no live vehicle positions; say so plainly instead of a 404.
        const feedId = `${normalizedProvider}${normalizedCategory ? `/${normalizedCategory}` : ''}`;
        if (NO_REALTIME_FEED[feedId]) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `No realtime feed is published for ${NO_REALTIME_FEED[feedId]} (${feedId}). Its static timetable is still available through get_transit_routes, get_transit_stops and get_transit_arrivals.`,
                  note: REALTIME_DATA_NOTE,
                }, null, 2),
              },
            ],
          };
        }

        // Build cache key
        const cacheKey = `${normalizedProvider}-${normalizedCategory || 'default'}`;

        // Vehicle positions come from the 30-second cache, or are downloaded fresh
        let vehiclePositions: any[];
        let cached = false;
        let timestamp = Date.now();
        const cachedEntry = gtfsCache.realtime.get(cacheKey);
        if (!force_refresh && cachedEntry && Date.now() - cachedEntry.timestamp < REALTIME_CACHE_EXPIRY) {
          vehiclePositions = cachedEntry.data;
          cached = true;
          timestamp = cachedEntry.timestamp;
        } else {
          // Build URL from the normalized values (e.g. ".../vehicle-position/ktmb/" or
          // ".../vehicle-position/prasarana/?category=rapid-bus-kl"), with nothing after the category
          const url = buildGtfsUrl(GTFS_REALTIME_ENDPOINT, normalizedProvider, normalizedCategory);

          // Download Protocol Buffer data
          const response = await axios.get(url, { responseType: 'arraybuffer' });

          // Parse Protocol Buffer data
          const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(response.data)
          );

          // Convert to plain JavaScript object
          vehiclePositions = feed.entity.map(entity => {
            if (!entity.vehicle) {
              return null;
            }
            
            const vehicle = entity.vehicle;
            return {
              id: entity.id,
              vehicle: {
                trip: vehicle.trip ? {
                  tripId: vehicle.trip.tripId,
                  routeId: vehicle.trip.routeId,
                  directionId: vehicle.trip.directionId,
                  startTime: vehicle.trip.startTime,
                  startDate: vehicle.trip.startDate,
                  scheduleRelationship: vehicle.trip.scheduleRelationship,
                } : undefined,
                position: vehicle.position ? {
                  latitude: vehicle.position.latitude,
                  longitude: vehicle.position.longitude,
                  bearing: vehicle.position.bearing,
                  speed: vehicle.position.speed,
                } : undefined,
                currentStopSequence: vehicle.currentStopSequence,
                stopId: vehicle.stopId,
                currentStatus: vehicle.currentStatus,
                timestamp: vehicle.timestamp ? new Date(typeof vehicle.timestamp === 'number' ? vehicle.timestamp * 1000 : (vehicle.timestamp as any).low * 1000).toISOString() : undefined,
                congestionLevel: vehicle.congestionLevel,
                occupancyStatus: vehicle.occupancyStatus,
              },
            };
          }).filter(Boolean);
          
          // Cache the result
          gtfsCache.realtime.set(cacheKey, {
            data: vehiclePositions,
            timestamp,
          });
        }

        // Optional route filter, then one page. WHY: a busy fleet (Rapid Penang has ~160 buses)
        // is ~100 KB of text, more than many AI clients accept in a single tool result.
        const wantedRoute = route_id?.trim().toLowerCase();
        const matching = wantedRoute
          ? vehiclePositions.filter((v: any) => String(v?.vehicle?.trip?.routeId ?? '').toLowerCase() === wantedRoute)
          : vehiclePositions;
        const shown = matching.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `GTFS realtime vehicle positions for ${feedId}${cached ? ' (from cache)' : ''}`,
                data: shown,
                count: shown.length,
                total_vehicles: vehiclePositions.length,
                ...(route_id ? { route_id, matching_vehicles: matching.length } : {}),
                note: matching.length > shown.length
                  ? `Showing ${shown.length} of ${matching.length} vehicles. Use route_id for one route, or raise limit (max 500).`
                  : undefined,
                cached,
                timestamp,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to parse GTFS realtime data',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: buildGtfsUrl(GTFS_REALTIME_ENDPOINT, normalized.provider, normalized.category),
                response_data: responseData,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Get transit routes
  server.tool(
    prefixToolName('get_transit_routes'),
    'Get transit routes from GTFS data. IMPORTANT: For transit route queries like "Show me bus routes for Rapid Penang", use this tool directly with the provider name.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      route_id: z.string().optional().describe('Route number as shown on the bus or train (e.g. "401") or route_id, to show just that route'),
    },
    async ({ provider, category, route_id }) => {
      // Normalize provider and category (done before "try" so the error handler can show the real URL)
      const normalized = normalizeProviderAndCategory(provider, category);
      try {
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Get the static feed (cached for 24 hours; one shared download if several calls arrive together)
        const { data: gtfsData } = await loadGtfsStatic(normalized.provider, normalized.category);

        // Extract routes data
        const routes = gtfsData.routes || [];
        const feedLabel = `${normalized.provider}${normalized.category ? `/${normalized.category}` : ''}`;

        // Filter by route if given (the route number like "401", or the route_id)
        let filteredRoutes = routes;
        if (route_id) {
          const routeIds = resolveRouteIds(gtfsData, route_id);
          if (routeIds.size === 0) return unknownRouteResult(gtfsData, route_id, feedLabel);
          filteredRoutes = routes.filter((route: { route_id: string }) => routeIds.has(route.route_id));
        }
        
        // Add trips information to each route
        const routesWithTrips = filteredRoutes.map((route: { route_id: string }) => {
          const trips = (gtfsData.trips || [])
            .filter((trip: { route_id: string }) => trip.route_id === route.route_id);
          
          return {
            ...route,
            trips_count: trips.length,
          };
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully retrieved routes for provider: ${normalized.provider}${normalized.category ? `, category: ${normalized.category}` : ''}`,
                data: routesWithTrips,
                count: routesWithTrips.length,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to retrieve transit routes',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: buildGtfsUrl(GTFS_STATIC_ENDPOINT, normalized.provider, normalized.category),
                response_data: responseData,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Get transit stops
  server.tool(
    prefixToolName('get_transit_stops'),
    'Get transit stops from GTFS data. IMPORTANT: For transit stop queries like "Show me bus stops for Rapid Penang", use this tool directly with the provider name. The tool supports common names like "rapid penang", "rapid kl bus", "ktmb", or "mybas johor" which will be automatically mapped to the correct provider and category. No need to use list_transport_agencies first. Returns up to "limit" stops (default 50); use offset to page.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      route_id: z.string().optional().describe('Only stops on this route: the route number shown on the bus or train (e.g. "401") or route_id (optional)'),
      stop_id: z.string().optional().describe('Specific stop ID to retrieve (optional)'),
      limit: z.number().int().min(1).max(500).optional().describe('Maximum number of stops to return (default 50, max 500)'),
      offset: z.number().int().min(0).optional().describe('Number of matching stops to skip, for paging (default 0)'),
    },
    async ({ provider, category, route_id, stop_id, limit = 50, offset = 0 }) => {
      // Normalize provider and category (done before "try" so the error handler can show the real URL)
      const normalized = normalizeProviderAndCategory(provider, category);
      try {
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Get the static feed (cached for 24 hours; one shared download if several calls arrive together)
        const { data: gtfsData } = await loadGtfsStatic(normalized.provider, normalized.category);

        // Extract stops data
        const stops = gtfsData.stops || [];

        // Filter by stop_id if provided
        let filteredStops = stop_id
          ? stops.filter((stop: { stop_id: string }) => stop.stop_id === stop_id)
          : stops;

        // If a route is given, keep only stops on that route (route number like "401", or route_id)
        if (route_id) {
          const routeIds = resolveRouteIds(gtfsData, route_id);
          if (routeIds.size === 0) {
            return unknownRouteResult(gtfsData, route_id, `${normalized.provider}${normalized.category ? `/${normalized.category}` : ''}`);
          }

          // Get trips for the route (a Set makes the lookups below instant instead of scanning a list)
          const routeTrips = new Set(
            (gtfsData.trips || [])
              .filter((trip: { route_id: string; trip_id: string }) => routeIds.has(trip.route_id))
              .map((trip: { trip_id: string }) => trip.trip_id)
          );

          // Get stop_ids served by those trips
          const stopIds = new Set(
            (gtfsData.stop_times || [])
              .filter((stopTime: { trip_id: string }) => routeTrips.has(stopTime.trip_id))
              .map((stopTime: { stop_id: string }) => stopTime.stop_id)
          );

          // Filter stops by stop_ids
          filteredStops = filteredStops.filter((stop: { stop_id: string }) => stopIds.has(stop.stop_id));
        }

        // Return one page. WHY: some feeds have 4,000+ stops (~770 KB of text), too much for an AI client.
        const page = filteredStops.slice(offset, offset + limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully retrieved stops for provider: ${normalized.provider}${normalized.category ? `, category: ${normalized.category}` : ''}`,
                data: page,
                count: page.length,
                total_matching: filteredStops.length,
                offset,
                limit,
                note: offset + page.length < filteredStops.length
                  ? `Showing ${page.length} of ${filteredStops.length} stops. Use offset/limit to page, or filter by route_id / stop_id, or use search_transit_stops_by_location / find_nearest_transit_stops.`
                  : undefined,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to retrieve transit stops',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: buildGtfsUrl(GTFS_STATIC_ENDPOINT, normalized.provider, normalized.category),
                response_data: responseData,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Get transit arrivals
  server.tool(
    prefixToolName('get_transit_arrivals'),
    'Get the next scheduled transit arrivals at a specific stop, from the published GTFS timetable (Malaysia time). data.gov.my publishes no realtime trip-update feed, so these are timetable times, not live predictions. IMPORTANT: Use this tool directly for queries like "When will the next bus arrive at my stop?" or "Show me arrival times for Rapid Penang buses at stop X".',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana", or common names like "rapid penang")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      stop_id: z.string().describe('ID of the stop to get arrivals for'),
      route_id: z.string().optional().describe('Optional: only this route, as the route number shown on the bus or train (e.g. "401") or route_id'),
      limit: z.number().optional().describe('Maximum number of arrivals to return (default: 10)'),
    },
    async ({ provider, category, stop_id, route_id, limit = 10 }) => {
      // Normalize provider and category (done before "try" so the error handler can show the real URL)
      const normalized = normalizeProviderAndCategory(provider, category);
      try {
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Get the static feed: stops, routes, trips, stop_times and calendars are all we need
        const { data: gtfsStaticData } = await loadGtfsStatic(normalized.provider, normalized.category);

        // Get stop information
        const stops = gtfsStaticData.stops || [];
        const stop = stops.find((s: any) => s.stop_id === stop_id);
        
        if (!stop) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `Stop ID ${stop_id} not found for provider: ${normalized.provider}${normalized.category ? `, category: ${normalized.category}` : ''}`,
                  valid_stop_ids: stops.map((s: any) => s.stop_id).slice(0, 10),
                  total_stops: stops.length,
                }, null, 2),
              },
            ],
          };
        }

        // Optional route filter (route number like "401", or route_id)
        let routeIds: Set<string> | undefined;
        if (route_id) {
          routeIds = resolveRouteIds(gtfsStaticData, route_id);
          if (routeIds.size === 0) {
            return unknownRouteResult(gtfsStaticData, route_id, `${normalized.provider}${normalized.category ? `/${normalized.category}` : ''}`);
          }
        }

        // Next services at this stop according to the timetable (see getScheduledArrivals)
        const arrivals = getScheduledArrivals(gtfsStaticData, stop_id, limit, routeIds);
        const hasHeadwayServices = arrivals.some(arrival => arrival.frequency_based);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Scheduled arrivals for stop: ${stop_id} (${stop.stop_name})`,
                arrivals_type: SCHEDULED_ARRIVALS_LABEL,
                stop: stop,
                arrivals,
                count: arrivals.length,
                current_time_malaysia: malaysiaClock(new Date()).label,
                note: arrivals.length === 0
                  ? `No more scheduled services at this stop for the rest of today (Malaysia time)${route_id ? ` on route ${route_id}` : ''}. ${REALTIME_DATA_NOTE}`
                  : `Times come from the published timetable (Malaysia time, UTC+8), not live tracking${hasHeadwayServices ? '; "frequency_based" services run every few minutes, so those times are estimates' : ''}. ${REALTIME_DATA_NOTE}`,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to get transit arrivals',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: buildGtfsUrl(GTFS_STATIC_ENDPOINT, normalized.provider, normalized.category),
                response_data: responseData,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Search transit stops by location name
  server.tool(
    prefixToolName('search_transit_stops_by_location'),
    'Search for transit stops near a named location. IMPORTANT: Use this tool for queries like "Show me bus stops near KLCC" or "What buses stop at KL Sentral?" This tool geocodes the location name to coordinates, then finds nearby stops. CRITICAL: For Rapid KL services, ALWAYS use specific terms in the provider parameter like "rapid kl bus", "rapid rail", "mrt feeder", "lrt", "mrt" instead of using "prasarana" with a separate category parameter. DO NOT use provider="prasarana" with category="rapid-rail-kl" as this causes 404 errors. Instead use provider="rapid rail" or provider="lrt" or provider="mrt" or provider="mrt feeder" or provider="rapid kl bus" without a category parameter.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana", or common names like "rapid penang")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      location: z.string().describe('Location name to search for (e.g., "KLCC", "KL Sentral", "Penang Airport")'),
      country: z.string().optional().describe('Country code to limit geocoding results (default: "my" for Malaysia)'),
      limit: z.number().optional().describe('Maximum number of stops to return (default: 5)'),
      max_distance: z.number().optional().describe('Maximum distance in kilometers (default: 5)'),
      include_arrivals: z.boolean().optional().describe('Whether to include upcoming arrivals for each stop (default: true)'),
      arrivals_limit: z.number().optional().describe('Maximum number of arrivals to include per stop (default: 3)'),
    },
    async ({ provider, category, location, country = 'my', limit = 5, max_distance = 5, include_arrivals = true, arrivals_limit = 3 }) => {
      // Store normalized values at function scope so they're available in catch block
      let normalizedProvider = provider;
      let normalizedCategory = category;
      
      try {
        // If the provider is a GENERIC Prasarana name and no category is given, guess bus vs rail
        // from the location text. Only for generic names: specific ones like "rapid penang" or
        // "mrt" already say which service they mean, and an explicit category now always wins,
        // so guessing for them would override the right answer.
        const genericPrasaranaNames = ['prasarana', 'rapid kl'];
        if (genericPrasaranaNames.includes(provider.trim().toLowerCase()) && !category) {
          // Analyze the location query to determine if it's likely a bus or rail search
          const locationLower = location.toLowerCase();
          
          // Check if the location contains keywords suggesting rail/LRT/MRT
          const railKeywords = ['lrt', 'mrt', 'monorail', 'train', 'station', 'rail', 'kelana jaya', 'ampang', 'sri petaling'];
          const isBusKeyword = locationLower.includes('bus') || locationLower.includes('stop');
          const isRailKeyword = railKeywords.some(keyword => locationLower.includes(keyword));
          
          if (isRailKeyword && !isBusKeyword) {
            // If location suggests rail and not bus, use rail category
            category = 'rapid-rail-kl';
          } else {
            // Default to bus if not clearly rail or if both bus and rail are mentioned
            category = 'rapid-bus-kl';
          }
        }
        
        // Step 1: Normalize provider and category first
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // Update function scope variables for catch block
        normalizedProvider = normalized.provider;
        normalizedCategory = normalized.category;
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Step 2: Geocode the location name to coordinates
        console.log(`Attempting to geocode location: ${location}`);
        let coordinates = await geocodeLocation(location, country);
        
        // If initial geocoding fails, try with additional context
        if (!coordinates) {
          console.log(`Geocoding failed for "${location}", trying with additional context...`);
          
          // Try with state/city context for Malaysian locations
          const locationVariations = Array.from(new Set([
            // Add full country name
            `${location}, Malaysia`,
            // Add common Malaysian states if not already in the query
            ...(!/penang|pulau pinang/i.test(location) ? [`${location}, Penang`, `${location}, Pulau Pinang`] : []),
            ...(!/selangor/i.test(location) ? [`${location}, Selangor`] : []),
            ...(!/kuala lumpur|kl/i.test(location) ? [`${location}, Kuala Lumpur`, `${location}, KL`] : []),
            ...(!/johor/i.test(location) ? [`${location}, Johor`] : []),
            // Try with common prefixes for condos/apartments
            ...(!/condo|condominium|apartment|residence|residency|heights|court|villa|garden|park/i.test(location) ? 
              [`${location} Condominium`, `${location} Residence`, `${location} Apartment`] : [])
          ]));
          
          // Try each variation until we get coordinates
          for (const variation of locationVariations) {
            console.log(`Trying variation: "${variation}"`);
            coordinates = await geocodeLocation(variation, country);
            if (coordinates) {
              console.log(`Successfully geocoded with variation: "${variation}"`);
              break;
            }
          }
        }
        
        // If all geocoding attempts fail, return error
        if (!coordinates) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `Could not geocode location: "${location}". Please try a different location name or provide more specific details.`,
                  location,
                  country,
                  provider_info: {
                    provider: normalizedProvider,
                    category: normalizedCategory,
                    valid_providers: VALID_PROVIDERS,
                    valid_categories: PRASARANA_CATEGORIES
                  },
                  suggestion: 'Please try a more specific address with city/state name, or use a nearby landmark.'
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values for provider and category
        provider = normalized.provider;
        category = normalized.category;

        // Get the static feed (cached for 24 hours; one shared download if several calls arrive together)
        const { data: gtfsStaticData } = await loadGtfsStatic(normalized.provider, normalized.category);

        // Step 3: Extract stops from GTFS data
        const stops = gtfsStaticData.stops || [];
        
        if (stops.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `No stops found for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                  provider: provider,
                  category: category,
                }, null, 2),
              },
            ],
          };
        }
        
        // Step 4: Calculate distances from user location to each stop
        const stopsWithDistance = stops.map((stop: any) => {
          // Skip stops without coordinates
          if (!stop.stop_lat || !stop.stop_lon) {
            return null;
          }
          
          const distance = haversineDistance(
            coordinates.lat,
            coordinates.lon,
            parseFloat(stop.stop_lat),
            parseFloat(stop.stop_lon)
          );
          
          return {
            ...stop,
            distance_km: distance,
            distance_m: Math.round(distance * 1000),
          };
        }).filter(Boolean);
        
        // Step 5: Filter stops by max distance and sort by proximity
        const nearbyStops = stopsWithDistance
          .filter((stop: any) => stop.distance_km <= max_distance)
          .sort((a: any, b: any) => a.distance_km - b.distance_km)
          .slice(0, limit);
        
        if (nearbyStops.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `No stops found within ${max_distance} km of "${location}"`,
                  location,
                  coordinates,
                  provider: provider,
                  category: category,
                  max_distance,
                  suggestion: 'Try increasing the max_distance parameter or searching for a different location.',
                }, null, 2),
              },
            ],
          };
        }
        
        // Step 6: If requested, add the next SCHEDULED arrivals for each stop.
        // (No live feed exists, so we no longer call the trip-update URL, which always returned 404.)
        let stopsWithArrivals = nearbyStops;

        if (include_arrivals) {
          // Add arrivals to each stop
          stopsWithArrivals = nearbyStops.map((stop: any) => ({
            ...stop,
            upcoming_arrivals: getScheduledArrivals(gtfsStaticData, stop.stop_id, arrivals_limit),
            arrivals_type: SCHEDULED_ARRIVALS_LABEL,
            has_realtime_data: false,
          }));
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Found ${stopsWithArrivals.length} stops near "${location}"`,
                location,
                coordinates,
                provider,
                category,
                stops: stopsWithArrivals,
                count: stopsWithArrivals.length,
                include_arrivals,
                current_time: new Date().toISOString(),
                current_time_malaysia: malaysiaClock(new Date()).label,
                search_parameters: {
                  max_distance,
                  limit,
                  arrivals_limit: include_arrivals ? arrivals_limit : undefined,
                },
                note: include_arrivals
                  ? `Arrivals are ${SCHEDULED_ARRIVALS_LABEL}: timetable times in Malaysia time (UTC+8). ${REALTIME_DATA_NOTE}`
                  : REALTIME_DATA_NOTE,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        // Error bodies arrive as raw bytes; decode them so the API's message is readable
        const parsedResponseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to search transit stops by location',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                response_data: parsedResponseData,
                location,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                suggestion: 'Make sure you are using a valid category for the provider. For Prasarana, use one of: ' + PRASARANA_CATEGORIES.join(', ') + '. For location-based searches, try adding more context like city or state name.'
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Find nearest transit stops
  server.tool(
    prefixToolName('find_nearest_transit_stops'),
    'Find the nearest transit stops to a given location. IMPORTANT: Use this tool directly for queries like "Where is the nearest bus stop to my location?" or "How do I get to the nearest Rapid Penang bus stop?"',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana", or common names like "rapid penang")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      latitude: z.number().describe('Latitude of the user\'s location'),
      longitude: z.number().describe('Longitude of the user\'s location'),
      limit: z.number().optional().describe('Maximum number of stops to return (default: 5)'),
      max_distance: z.number().optional().describe('Maximum distance in kilometers (default: 5)'),
    },
    async ({ provider, category, latitude, longitude, limit = 5, max_distance = 5 }) => {
      // Normalize provider and category (done before "try" so the error handler can show the real URL)
      const normalized = normalizeProviderAndCategory(provider, category);
      try {
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Get the static feed (cached for 24 hours; one shared download if several calls arrive together)
        const { data: gtfsData } = await loadGtfsStatic(normalized.provider, normalized.category);

        // Extract stops data
        const stops = gtfsData.stops || [];

        // Calculate distance for each stop
        const stopsWithDistance = stops.map((stop: any) => {
          // Skip stops without lat/lon
          if (!stop.stop_lat || !stop.stop_lon) {
            return { ...stop, distance: Infinity };
          }
          
          // Calculate distance using Haversine formula
          const stopLat = parseFloat(stop.stop_lat);
          const stopLon = parseFloat(stop.stop_lon);
          
          // Haversine formula
          const R = 6371; // Earth radius in km
          const dLat = (stopLat - latitude) * Math.PI / 180;
          const dLon = (stopLon - longitude) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(latitude * Math.PI / 180) * Math.cos(stopLat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c; // Distance in km
          
          return { ...stop, distance };
        });
        
        // Filter by max distance and sort by distance
        const nearestStops = stopsWithDistance
          .filter((stop: any) => stop.distance <= max_distance)
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, limit);
        
        // Format distances to be more readable
        const formattedStops = nearestStops.map((stop: any) => ({
          ...stop,
          distance_km: parseFloat(stop.distance.toFixed(2)),
          distance_m: parseFloat((stop.distance * 1000).toFixed(0)),
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully found nearest stops for provider: ${normalized.provider}${normalized.category ? `, category: ${normalized.category}` : ''}`,
                data: formattedStops,
                count: formattedStops.length,
                user_location: { latitude, longitude },
                provider_info: { provider: normalized.provider, category: normalized.category },
                note: REALTIME_DATA_NOTE,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = decodeErrorBody(axiosError?.response?.data);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to find nearest transit stops',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: buildGtfsUrl(GTFS_STATIC_ENDPOINT, normalized.provider, normalized.category),
                response_data: responseData,
                provider_info: {
                  provider: provider,
                  category: category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: COMBINED_ERROR_NOTE,
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
