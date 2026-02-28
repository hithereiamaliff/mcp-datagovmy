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

// Race-condition guard: only one fetch in flight at a time
let fetchPromise: Promise<void> | null = null;

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
 * Fetch JSON files in batches with concurrency control.
 * Uses Promise.allSettled so individual failures don't abort the whole batch.
 */
async function fetchJsonBatch<T>(
  baseUrl: string,
  filenames: string[],
  transform: (data: Record<string, unknown>, filename: string) => T
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < filenames.length; i += GITHUB_FETCH_BATCH_SIZE) {
    const batch = filenames.slice(i, i + GITHUB_FETCH_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (filename) => {
        const url = `${baseUrl}/${filename}`;
        const response = await axios.get(url);
        return transform(response.data, filename);
      })
    );

    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`Failed to fetch ${batch[j]}: ${getErrorMessage(result.reason)}`);
      }
    }
  }

  return results;
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

  // Step 3: Fetch all files with batched concurrency
  const [datasets, dashboards] = await Promise.all([
    fetchJsonBatch<DatasetMetadata>(
      GITHUB_RAW_BASE_URL,
      catalogueFiles,
      (data, filename) => ({
        ...data,
        id: filename.replace(/\.json$/, ''),
      } as DatasetMetadata)
    ),
    fetchJsonBatch<DashboardMetadata>(
      GITHUB_DASHBOARDS_URL,
      dashboardFiles,
      (data, filename) => ({
        ...data,
        dashboard_name: (data.dashboard_name as string) || filename.replace(/\.json$/, ''),
      } as DashboardMetadata)
    ),
  ]);

  // Sort datasets alphabetically by id for stable pagination
  datasets.sort((a, b) => a.id.localeCompare(b.id));

  datasetsCache = datasets;
  dashboardsCache = dashboards;
  lastCacheUpdate = Date.now();

  console.log(`Index loaded: ${datasets.length} datasets, ${dashboards.length} dashboards`);
}

/**
 * Ensure the cache is loaded and fresh. Deduplicates concurrent calls.
 */
async function ensureLoaded(): Promise<void> {
  if (lastCacheUpdate > 0 && Date.now() - lastCacheUpdate < CACHE_TTL) {
    return; // Cache is fresh
  }

  if (fetchPromise) {
    return fetchPromise; // Another fetch is in flight, wait for it
  }

  fetchPromise = doFetch();
  try {
    await fetchPromise;
  } catch (error) {
    console.error(`Failed to fetch indexes from GitHub: ${getErrorMessage(error)}`);
    // Leave existing cache (possibly empty) — callers handle empty gracefully
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
 * Force refresh the indexes regardless of TTL.
 */
export async function refreshIndexes(): Promise<void> {
  lastCacheUpdate = 0; // Invalidate cache
  await ensureLoaded();
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
