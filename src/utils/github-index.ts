/**
 * Live GitHub index fetcher for datasets and dashboards.
 * Replaces static pre-generated indexes with real-time data from
 * https://github.com/data-gov-my/datagovmy-meta
 */

import axios from 'axios';
import {
  GITHUB_API_BASE_URL,
  GITHUB_RAW_BASE_URL,
  GITHUB_DASHBOARDS_URL,
  GITHUB_FETCH_BATCH_SIZE,
  GITHUB_TOKEN,
  CACHE_TTL,
} from '../config.js';

// Re-export interfaces so consumers can import from here
export interface DatasetMetadata {
  id: string;
  title_en: string;
  title_ms: string;
  description_en: string;
  description_ms: string;
  frequency: string;
  geography: string[];
  demography: string[];
  dataset_begin?: number;
  dataset_end?: number;
  data_source: string[];
  [key: string]: unknown;
}

export interface DashboardMetadata {
  dashboard_name: string;
  data_last_updated?: string;
  data_next_update?: string;
  route?: string;
  sites?: string[];
  required_params?: string[];
  optional_params?: string[];
  charts?: Record<string, unknown>;
  [key: string]: unknown;
}

// --- In-memory cache ---
let datasetsCache: DatasetMetadata[] = [];
let dashboardsCache: DashboardMetadata[] = [];
let lastCacheUpdate = 0;

// The same records keyed by their GitHub filename. If a file fails to load on
// the next refresh, its last good copy is taken from here instead of dropping it.
let datasetsByFile = new Map<string, DatasetMetadata>();
let dashboardsByFile = new Map<string, DashboardMetadata>();

// Race-condition guard: only one fetch in flight at a time
let fetchPromise: Promise<void> | null = null;

// After a failed refresh, wait this long before asking GitHub again. Without it,
// a GitHub outage or rate limit would trigger a new fetch on every tool call.
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;
let lastFailedFetch = 0;

// --- GitHub Trees API types ---
interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

interface TreeResponse {
  sha: string;
  tree: TreeEntry[];
  truncated: boolean;
}

const githubApiHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'mcp-datagovmy',
};

if (GITHUB_TOKEN) {
  githubApiHeaders.Authorization = `Bearer ${GITHUB_TOKEN}`;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// --- Record validation -------------------------------------------------------

/** True for a JSON object: not an array, not a string, not null. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Years stay numbers; "2015" or "2015-01-01" become 2015; anything else is dropped. */
function asOptionalYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.trim().match(/^\d{4}/);
    if (match) return Number(match[0]);
  }
  return undefined;
}

/**
 * Turn one data-catalogue JSON file into a DatasetMetadata record, or return
 * null if the file isn't a JSON object at all.
 *
 * Why the null check matters: axios does NOT throw on invalid JSON. It quietly
 * hands back the raw text, and spreading a string gives {0:'{', 1:'\n', ...}
 * with no title fields. On 22 Nov 2026 upstream committed arc_dosm.json with
 * git merge-conflict markers in it, and that single record made every catalogue
 * search fail with "Cannot read properties of undefined (reading 'toLowerCase')".
 *
 * Missing text fields become '' and missing lists become [], so the rest of the
 * code can trust the declared types.
 */
export function normalizeDatasetRecord(data: unknown, id: string): DatasetMetadata | null {
  if (!isPlainObject(data)) return null;

  return {
    ...data,
    id,
    title_en: asString(data.title_en) || id,
    title_ms: asString(data.title_ms),
    description_en: asString(data.description_en),
    description_ms: asString(data.description_ms),
    frequency: asString(data.frequency),
    geography: asStringArray(data.geography),
    demography: asStringArray(data.demography),
    data_source: asStringArray(data.data_source),
    dataset_begin: asOptionalYear(data.dataset_begin),
    dataset_end: asOptionalYear(data.dataset_end),
  } as DatasetMetadata;
}

/** Same idea for a dashboard JSON file. The name falls back to the filename. */
export function normalizeDashboardRecord(data: unknown, fallbackName: string): DashboardMetadata | null {
  if (!isPlainObject(data)) return null;

  return {
    ...data,
    dashboard_name: asString(data.dashboard_name) || fallbackName,
    route: asString(data.route) || undefined,
    sites: Array.isArray(data.sites) ? asStringArray(data.sites) : undefined,
  } as DashboardMetadata;
}

// --- Fetching ----------------------------------------------------------------

/**
 * Fetch the list of .json filenames from a GitHub tree SHA.
 * Excludes subtrees (e.g. openapi/).
 */
async function listJsonFiles(treeSha: string): Promise<string[]> {
  const url = `${GITHUB_API_BASE_URL}/git/trees/${treeSha}`;
  const response = await axios.get<TreeResponse>(url, { headers: githubApiHeaders });
  return response.data.tree
    .filter(entry => entry.type === 'blob' && entry.path.endsWith('.json'))
    .map(entry => entry.path);
}

/**
 * Fetch JSON files in batches with concurrency control, keyed by filename.
 * Uses Promise.allSettled so individual failures don't abort the whole batch.
 *
 * A file that fails (network error, or `toRecord` returned null because the
 * file is broken) keeps its last good copy from `previous` if there is one,
 * otherwise it is skipped with a warning in the logs.
 */
async function fetchJsonBatch<T>(
  baseUrl: string,
  filenames: string[],
  toRecord: (data: unknown, filename: string) => T | null,
  previous: Map<string, T>
): Promise<Map<string, T>> {
  const byFile = new Map<string, T>();

  for (let i = 0; i < filenames.length; i += GITHUB_FETCH_BATCH_SIZE) {
    const batch = filenames.slice(i, i + GITHUB_FETCH_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (filename) => {
        const response = await axios.get(`${baseUrl}/${filename}`);
        const record = toRecord(response.data, filename);
        if (record === null) {
          throw new Error('not a valid JSON object (the upstream file may be broken)');
        }
        return record;
      })
    );

    settled.forEach((result, j) => {
      const filename = batch[j];
      if (result.status === 'fulfilled') {
        byFile.set(filename, result.value);
        return;
      }

      const lastGood = previous.get(filename);
      if (lastGood) {
        byFile.set(filename, lastGood);
        console.warn(`Failed to fetch ${filename}: ${getErrorMessage(result.reason)}. Keeping the last good copy.`);
      } else {
        console.warn(`Failed to fetch ${filename}: ${getErrorMessage(result.reason)}. Skipping it.`);
      }
    });
  }

  return byFile;
}

/**
 * Perform the actual fetch of all datasets and dashboards from GitHub.
 */
async function doFetch(): Promise<void> {
  console.log('Fetching live indexes from GitHub...');

  // Step 1: Get root tree to find subtree SHAs
  const rootUrl = `${GITHUB_API_BASE_URL}/git/trees/main`;
  const rootResponse = await axios.get<TreeResponse>(rootUrl, { headers: githubApiHeaders });
  const rootTree = rootResponse.data.tree;

  const catalogueEntry = rootTree.find(e => e.path === 'data-catalogue' && e.type === 'tree');
  const dashboardsEntry = rootTree.find(e => e.path === 'dashboards' && e.type === 'tree');

  if (!catalogueEntry || !dashboardsEntry) {
    throw new Error('Could not find data-catalogue or dashboards directory in repo');
  }

  // Step 2: List files in both directories
  const [catalogueFiles, dashboardFiles] = await Promise.all([
    listJsonFiles(catalogueEntry.sha),
    listJsonFiles(dashboardsEntry.sha),
  ]);

  console.log(`Found ${catalogueFiles.length} datasets, ${dashboardFiles.length} dashboards`);

  // Step 3: Fetch all files with batched concurrency, validating each one
  const [newDatasetsByFile, newDashboardsByFile] = await Promise.all([
    fetchJsonBatch<DatasetMetadata>(
      GITHUB_RAW_BASE_URL,
      catalogueFiles,
      (data, filename) => normalizeDatasetRecord(data, filename.replace(/\.json$/, '')),
      datasetsByFile
    ),
    fetchJsonBatch<DashboardMetadata>(
      GITHUB_DASHBOARDS_URL,
      dashboardFiles,
      (data, filename) => normalizeDashboardRecord(data, filename.replace(/\.json$/, '')),
      dashboardsByFile
    ),
  ]);

  // Don't swap a working cache for an empty one (e.g. raw.githubusercontent.com is down)
  if (newDatasetsByFile.size === 0 && catalogueFiles.length > 0) {
    throw new Error('None of the data-catalogue files could be loaded from GitHub');
  }

  // Sort datasets alphabetically by id for stable pagination
  const datasets = [...newDatasetsByFile.values()].sort((a, b) => a.id.localeCompare(b.id));
  const dashboards = [...newDashboardsByFile.values()];

  datasetsCache = datasets;
  dashboardsCache = dashboards;
  datasetsByFile = newDatasetsByFile;
  dashboardsByFile = newDashboardsByFile;
  lastCacheUpdate = Date.now();

  console.log(`Index loaded: ${datasets.length} datasets, ${dashboards.length} dashboards`);
}

/**
 * Ensure the cache is loaded and fresh. Deduplicates concurrent calls.
 * If cache exists but is stale, returns immediately and refreshes in background.
 */
async function ensureLoaded(): Promise<void> {
  const cacheExists = lastCacheUpdate > 0;
  const isFresh = cacheExists && Date.now() - lastCacheUpdate < CACHE_TTL;

  if (isFresh) {
    return; // Cache is fresh
  }

  if (fetchPromise) {
    // Another fetch is in flight
    if (cacheExists) return; // Serve stale cache, background fetch will update it
    return fetchPromise; // No cache yet, must wait
  }

  // The last refresh failed recently: keep serving the stale copy for now
  if (cacheExists && Date.now() - lastFailedFetch < RETRY_AFTER_FAILURE_MS) {
    return;
  }

  fetchPromise = doFetch();

  if (cacheExists) {
    // Stale cache exists — refresh in background, don't block the caller
    fetchPromise.catch(error => {
      lastFailedFetch = Date.now();
      console.error(`Background refresh failed: ${getErrorMessage(error)}`);
    }).finally(() => {
      fetchPromise = null;
    });
    return;
  }

  // No cache yet (first load) — must wait for fetch to complete. If it fails,
  // report the error rather than returning an empty list, which tools would
  // otherwise present as "0 results".
  try {
    await fetchPromise;
  } catch (error) {
    console.error(`Failed to fetch indexes from GitHub: ${getErrorMessage(error)}`);
    throw new Error(`Could not load the dataset index from GitHub: ${getErrorMessage(error)}`);
  } finally {
    fetchPromise = null;
  }
}

/**
 * Get all datasets. Lazy-loads from GitHub on first call, caches with TTL.
 */
export async function getDatasets(): Promise<DatasetMetadata[]> {
  await ensureLoaded();
  return datasetsCache;
}

/**
 * Get all dashboards. Lazy-loads from GitHub on first call, caches with TTL.
 */
export async function getDashboards(): Promise<DashboardMetadata[]> {
  await ensureLoaded();
  return dashboardsCache;
}

/**
 * Pre-warm the cache on server startup. Fires and forgets — does not block.
 */
export function warmCache(): void {
  ensureLoaded().catch(error => {
    console.error(`Cache warm-up failed: ${getErrorMessage(error)}`);
  });
}

/**
 * Force refresh the indexes regardless of TTL. If the refresh fails, the error
 * is thrown and the existing cache is kept as it was.
 */
export async function refreshIndexes(): Promise<void> {
  if (fetchPromise) {
    await fetchPromise.catch(() => undefined); // let an in-flight fetch finish first
  }
  fetchPromise = doFetch();
  try {
    await fetchPromise;
  } finally {
    fetchPromise = null;
  }
}

/**
 * Get health/status information about the index cache.
 */
export function getIndexHealth(): {
  lastUpdated: number;
  datasetCount: number;
  dashboardCount: number;
  isStale: boolean;
} {
  return {
    lastUpdated: lastCacheUpdate,
    datasetCount: datasetsCache.length,
    dashboardCount: dashboardsCache.length,
    isStale: lastCacheUpdate === 0 || Date.now() - lastCacheUpdate > CACHE_TTL,
  };
}
