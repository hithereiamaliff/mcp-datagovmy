/**
 * Unit tests for catalogue / dashboard search. No network access: every test
 * builds its own small in-memory catalogue.
 *
 * Run with:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeDatasetRecord,
  normalizeDashboardRecord,
  type DatasetMetadata,
  type DashboardMetadata,
} from '../src/utils/github-index.js';
import { rankDatasets, filterDatasets } from '../src/datacatalogue.tools.js';
import { rankDashboards, dashboardUrl } from '../src/dashboards.tools.js';
import { buildUnifiedResults } from '../src/unified-search.tools.js';
import { tokenizeQuery } from '../src/utils/search.js';

/** A complete catalogue entry, shaped like the upstream JSON files. */
function dataset(id: string, overrides: Record<string, unknown> = {}): DatasetMetadata {
  const record = normalizeDatasetRecord(
    {
      title_en: `Title ${id}`,
      title_ms: `Tajuk ${id}`,
      description_en: `Description of ${id}`,
      description_ms: `Penerangan ${id}`,
      frequency: 'MONTHLY',
      geography: ['NATIONAL'],
      demography: [],
      data_source: ['DOSM'],
      dataset_begin: 2015,
      dataset_end: 2024,
      ...overrides,
    },
    id
  );
  assert.ok(record);
  return record;
}

const WAGES = dataset('formal_wages_percentile', {
  title_en: 'Formal Sector Wages by Percentile',
  title_ms: 'Gaji Sektor Formal mengikut Persentil',
  description_en: 'Monthly wages of formal sector employees, by percentile.',
});
const CPI = dataset('cpi_core', {
  title_en: 'Core Consumer Price Index',
  description_en: 'Core CPI by division.',
});

test('search does not crash on catalogue entries that lack title/description fields', () => {
  // Entries straight from upstream, NOT normalized, with fields missing:
  const missingFields = { id: 'formal_wages_state', title_en: 'Formal Sector Wages by State' };
  // The exact shape that broke production on 22 Nov 2026: axios returned the raw
  // text of a broken JSON file and the old loader spread the string into an object.
  const spreadString = { ...'{\n<<<<<<< Updated upstream\n"title_en": "x"', id: 'arc_dosm' };

  const catalogue = [WAGES, CPI, missingFields, spreadString] as unknown as DatasetMetadata[];

  let results: ReturnType<typeof rankDatasets> = [];
  assert.doesNotThrow(() => {
    results = rankDatasets('formal sector wages', catalogue);
  });
  const ids = results.map(r => r.dataset.id);
  assert.ok(ids.includes('formal_wages_state'), 'entry with missing fields is still searchable by its title');
  assert.ok(ids.includes('formal_wages_percentile'));
  assert.ok(!ids.includes('cpi_core'), 'unrelated dataset does not match');
  assert.ok(!ids.includes('arc_dosm'), 'broken entry is simply not matched');
});

test('normalizeDatasetRecord rejects files that are not JSON objects', () => {
  // What axios hands back for a file with merge-conflict markers: the raw text
  const brokenFileText = '{\n  "title_en": "DOSM\'s Advance Release Calendar",\n<<<<<<< Updated upstream\n';
  assert.equal(normalizeDatasetRecord(brokenFileText, 'arc_dosm'), null);
  assert.equal(normalizeDatasetRecord(null, 'x'), null);
  assert.equal(normalizeDatasetRecord([1, 2], 'x'), null);
  assert.equal(normalizeDashboardRecord(brokenFileText, 'x'), null);
});

test('normalizeDatasetRecord fills in missing or oddly-typed fields', () => {
  const record = normalizeDatasetRecord({ description_ms: 42, dataset_begin: '2015', geography: 'STATE' }, 'odd_one');
  assert.ok(record);
  assert.equal(record.id, 'odd_one');
  assert.equal(record.title_en, 'odd_one', 'missing English title falls back to the id');
  assert.equal(record.title_ms, '');
  assert.equal(record.description_en, '');
  assert.equal(record.description_ms, '', 'non-string becomes empty string');
  assert.deepEqual(record.geography, [], 'non-array becomes empty list');
  assert.equal(record.dataset_begin, 2015, 'numeric string year becomes a number');
  assert.equal(record.dataset_end, undefined);
});

test('results are ranked best match first', () => {
  const sectorOnly = dataset('gdp_sector', { title_en: 'GDP by Economic Sector', description_en: 'Quarterly GDP by sector.' });
  const results = rankDatasets('formal sector wages', [sectorOnly, CPI, WAGES]);
  assert.deepEqual(results.map(r => r.dataset.id), ['formal_wages_percentile', 'gdp_sector']);
  assert.ok(results[0].score > results[1].score);
});

test('stop words and single letters are not used as search terms', () => {
  assert.deepEqual(tokenizeQuery('Wages by state in Malaysia'), ['wages', 'state', 'malaysia']);
  assert.deepEqual(tokenizeQuery('e-wallet'), ['wallet']);
  // "in" would otherwise match almost any description ("...in Malaysia")
  assert.deepEqual(rankDatasets('wages in', [CPI, WAGES]).map(r => r.dataset.id), ['formal_wages_percentile']);
});

test('filterDatasets is case-insensitive', () => {
  const state = dataset('wages_state', { frequency: 'ANNUAL', geography: ['STATE'] });
  const results = filterDatasets({ frequency: 'annual', geography: ['state'] }, [WAGES, state]);
  assert.deepEqual(results.map(d => d.id), ['wages_state']);
});

test('dashboard links use the English route, and a missing route does not crash', () => {
  const formalWages = normalizeDashboardRecord(
    {
      dashboard_name: 'formal_wages',
      route: '/dashboard/formal-sector-wages,/ms-MY/dashboard/formal-sector-wages',
      sites: ['opendosm'],
    },
    'formal_wages'
  ) as DashboardMetadata;
  const noRoute = { dashboard_name: 'no_route_dashboard' } as DashboardMetadata;

  assert.equal(dashboardUrl(formalWages), 'https://open.dosm.gov.my/dashboard/formal-sector-wages');
  assert.equal(dashboardUrl(noRoute), undefined);
  assert.deepEqual(
    rankDashboards('formal sector wages', [noRoute, formalWages]).map(r => r.dashboard.dashboard_name),
    ['formal_wages']
  );
});

test('search_all results contain each dataset/dashboard once', () => {
  const dash = normalizeDashboardRecord(
    { dashboard_name: 'formal_wages', route: '/dashboard/formal-sector-wages', sites: ['opendosm'] },
    'formal_wages'
  ) as DashboardMetadata;

  const results = buildUnifiedResults('wages', [WAGES, CPI], [dash], 'dataset');
  const keys = results.map(r => `${r.type}:${r.id}`);
  assert.deepEqual(keys.sort(), ['dashboard:formal_wages', 'dataset:formal_wages_percentile']);
});
