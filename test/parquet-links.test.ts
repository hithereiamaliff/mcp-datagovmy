/**
 * Unit tests for find_dashboard_for_parquet's link lookup. No network access:
 * the dashboard and catalogue metadata are small hand-made copies of real entries.
 *
 * Run with:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { findPagesForParquet } from '../src/parquet.tools.js';
import {
  normalizeDashboardRecord,
  normalizeDatasetRecord,
  type DashboardMetadata,
  type DatasetMetadata,
} from '../src/utils/github-index.js';

// The Formal Sector Wages dashboard; upstream writes its chart sources with http://
const formalWagesDashboard = normalizeDashboardRecord(
  {
    dashboard_name: 'formal_wages',
    route: '/dashboard/formal-sector-wages,/ms-MY/dashboard/formal-sector-wages',
    sites: ['opendosm'],
    charts: {
      bar_percentile: { chart_source: 'http://storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_percentile.parquet' },
      timeseries: { chart_source: 'http://storage.dosm.gov.my/dashboards/labour_formalwages_timeseries_state.parquet' },
    },
  },
  'formal_wages'
) as DashboardMetadata;

const otherDashboard = normalizeDashboardRecord(
  { dashboard_name: 'bed_util', route: '/dashboard/hospital-bed-utilisation', sites: ['kkmnow'], charts: {} },
  'bed_util'
) as DashboardMetadata;

// A catalogue dataset (listed on both data.gov.my and OpenDOSM)
const percentileDataset = normalizeDatasetRecord(
  {
    title_en: 'Monthly Formal Sector Wage Percentiles',
    link_parquet: 'https://storage.dosm.gov.my/labour/formal_wages_percentile.parquet',
    site_category: [{ site: 'datagovmy' }, { site: 'opendosm' }],
  },
  'formal_wages_percentile'
) as DatasetMetadata;

const dashboards = [otherDashboard, formalWagesDashboard];
const datasets = [percentileDataset];

test('a dashboard chart file links to its dashboard, however the address is written', () => {
  for (const url of [
    'https://storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_percentile.parquet',
    'http://storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_percentile.parquet ',
    'https://s3.ap-southeast-1.amazonaws.com/storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_percentile.parquet',
  ]) {
    const pages = findPagesForParquet(url, datasets, dashboards);
    assert.equal(pages.match, 'dashboard_chart', url);
    assert.equal(pages.best_url, 'https://open.dosm.gov.my/dashboard/formal-sector-wages', url);
    assert.deepEqual(pages.dashboards[0].charts, ['bar_percentile'], url);
  }
});

test('a catalogue download links to its catalogue page, with the related dashboard', () => {
  const pages = findPagesForParquet('https://storage.dosm.gov.my/labour/formal_wages_percentile.parquet', datasets, dashboards);
  assert.equal(pages.match, 'data_catalogue');
  assert.equal(pages.best_url, 'https://data.gov.my/data-catalogue/formal_wages_percentile');
  assert.equal(pages.datasets[0].opendosm_url, 'https://open.dosm.gov.my/data-catalogue/formal_wages_percentile');
  assert.deepEqual(pages.related_dashboards.map(d => d.dashboard_name), ['formal_wages']);
});

test('an unknown file gets no made-up match', () => {
  const pages = findPagesForParquet('https://storage.data.gov.my/unknown/nothing.parquet', datasets, dashboards);
  assert.equal(pages.match, 'none');
  assert.equal(pages.best_url, 'https://data.gov.my/dashboard');
  assert.deepEqual([pages.dashboards, pages.datasets, pages.related_dashboards], [[], [], []]);
});
