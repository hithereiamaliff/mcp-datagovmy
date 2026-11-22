import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { buildSearchTerms, scoreMatch, searchableText, SearchTerms } from './utils/search.js';
import { getDatasets, normalizeDatasetRecord } from './utils/github-index.js';
import { GITHUB_RAW_BASE_URL, CACHE_TTL } from './config.js';

// Re-export the interface for consumers
export type { DatasetMetadata } from './utils/github-index.js';
import type { DatasetMetadata } from './utils/github-index.js';

interface DatasetFilterOptions {
  categories: string[];
  geographies: string[];
  frequencies: string[];
  demographies: string[];
  dataSources: string[];
}

interface DatasetFilterCriteria {
  frequency?: string;
  geography?: string[];
  demography?: string[];
  dataSource?: string[];
  yearRange?: [number, number];
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

// Cache for detailed dataset metadata (individual file fetches).
// Each entry keeps its own timestamp so it expires on its own schedule.
const detailsCache = new Map<string, { data: DatasetMetadata; fetchedAt: number }>();

// Helper function to get all datasets (now async, fetches live from GitHub)
export async function getAllDatasets(): Promise<DatasetMetadata[]> {
  return getDatasets();
}

/**
 * The fields an AI client needs to choose a dataset. The full metadata (field
 * definitions, methodology, translations...) is ~8 KB per dataset, which makes
 * a 20-result list ~150 KB, too large for many clients. get_dataset_details
 * still returns everything.
 */
function summarizeDataset(d: DatasetMetadata) {
  return {
    id: d.id,
    title_en: d.title_en,
    title_ms: d.title_ms,
    description_en: d.description_en,
    frequency: d.frequency,
    geography: d.geography,
    demography: d.demography,
    data_source: d.data_source,
    dataset_begin: d.dataset_begin,
    dataset_end: d.dataset_end,
    last_updated: d.last_updated,
    link_csv: d.link_csv,
    link_parquet: d.link_parquet,
    url: `https://data.gov.my/data-catalogue/${d.id}`,
  };
}

/**
 * Filter options built from the live catalogue. (They used to come from a
 * filters.json file upstream, which no longer exists, so this tool always failed.)
 */
function buildFilterOptions(datasets: DatasetMetadata[]): DatasetFilterOptions {
  const uniqueSorted = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

  // site_category looks like [{ site: 'opendosm', category_en: 'Labour Markets', ... }]
  const categoriesOf = (d: DatasetMetadata): string[] =>
    Array.isArray(d.site_category)
      ? d.site_category
          .map(c => (c as { category_en?: unknown } | null)?.category_en)
          .filter((name): name is string => typeof name === 'string')
      : [];

  return {
    categories: uniqueSorted(datasets.flatMap(categoriesOf)),
    geographies: uniqueSorted(datasets.flatMap(d => d.geography)),
    frequencies: uniqueSorted(datasets.map(d => d.frequency)),
    demographies: uniqueSorted(datasets.flatMap(d => d.demography)),
    dataSources: uniqueSorted(datasets.flatMap(d => d.data_source)),
  };
}

// Helper function to get detailed dataset by ID
async function getDatasetById(id: string): Promise<DatasetMetadata | null> {
  const cached = detailsCache.get(id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // The copy in the index (this may be the last good copy if the upstream file is broken)
  const datasets = await getAllDatasets();
  const indexCopy = datasets.find(d => d.id === id) ?? null;

  // Always try to fetch the latest file from GitHub first
  let responseData: unknown;
  try {
    const response = await axios.get(`${GITHUB_RAW_BASE_URL}/${encodeURIComponent(id)}.json`);
    responseData = response.data;
  } catch (error: unknown) {
    console.warn(`Error fetching dataset ${id} from GitHub:`, getErrorMessage(error));
    return indexCopy; // e.g. 404 -> null -> "not found" with suggestions
  }

  const detailedData = normalizeDatasetRecord(responseData, id);
  if (!detailedData) {
    // The file exists but isn't valid JSON (axios returns the raw text in that case)
    if (indexCopy) return indexCopy;
    throw new Error(
      `The metadata file for '${id}' exists on data.gov.my's GitHub but is currently not valid JSON ` +
      '(an upstream publishing error). Please try again later.'
    );
  }

  detailsCache.set(id, { data: detailedData, fetchedAt: Date.now() });
  return detailedData;
}

/** Score one dataset against a prepared query; 0 means it doesn't match. */
export function scoreDataset(d: DatasetMetadata, terms: SearchTerms): number {
  // searchableText() turns missing / non-string fields into '' instead of crashing
  return scoreMatch(
    {
      primary: `${searchableText(d.title_en)} | ${searchableText(d.title_ms)}`,
      id: searchableText(d.id),
      secondary: `${searchableText(d.description_en)} | ${searchableText(d.description_ms)}`,
    },
    terms
  );
}

/** Search an in-memory list of datasets: matches only, best match first (ties keep id order). */
export function rankDatasets(
  query: string,
  datasets: DatasetMetadata[]
): Array<{ dataset: DatasetMetadata; score: number }> {
  const terms = buildSearchTerms(query);
  return datasets
    .map(dataset => ({ dataset, score: scoreDataset(dataset, terms) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Helper function to search datasets with improved matching
export async function searchDatasets(query: string): Promise<DatasetMetadata[]> {
  return rankDatasets(query, await getAllDatasets()).map(result => result.dataset);
}

// Helper function to filter datasets (all comparisons are case-insensitive)
export function filterDatasets(filters: DatasetFilterCriteria, datasets: DatasetMetadata[]): DatasetMetadata[] {
  const lower = (values?: string[]) => (values ?? []).map(v => v.toLowerCase());
  const frequency = filters.frequency?.toLowerCase();
  const geography = lower(filters.geography);
  const demography = lower(filters.demography);
  const dataSource = lower(filters.dataSource);

  // True when no values were requested, or the dataset has at least one of them
  const hasAny = (wanted: string[], have: string[]) =>
    wanted.length === 0 || have.some(value => wanted.includes(searchableText(value)));

  return datasets.filter(d => {
    if (frequency && searchableText(d.frequency) !== frequency) return false;
    if (!hasAny(geography, d.geography)) return false;
    if (!hasAny(demography, d.demography)) return false;
    if (!hasAny(dataSource, d.data_source)) return false;
    if (filters.yearRange && d.dataset_begin !== undefined && d.dataset_end !== undefined &&
        (d.dataset_begin > filters.yearRange[1] || d.dataset_end < filters.yearRange[0])) return false;
    return true;
  });
}

export function registerDataCatalogueTools(server: McpServer) {
  // List all datasets with rich metadata
  server.tool(
    prefixToolName('list_datasets_catalogue'),
    'Lists datasets from the data.gov.my catalogue (summary fields; use get_dataset_details for full metadata)',
    {
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ limit = 20, offset = 0 }) => {
      try {
        const datasets = await getAllDatasets();
        const paginatedDatasets = datasets.slice(offset, offset + limit);
        const total = datasets.length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Datasets retrieved from comprehensive catalogue',
                total_datasets: total,
                showing: `${offset + 1}-${Math.min(offset + limit, total)} of ${total}`,
                pagination: {
                  limit,
                  offset,
                  next_offset: offset + limit < total ? offset + limit : null,
                  previous_offset: offset > 0 ? Math.max(0, offset - limit) : null,
                },
                datasets: paginatedDatasets.map(summarizeDataset),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to retrieve datasets',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Search datasets by query
  server.tool(
    prefixToolName('search_datasets_catalogue'),
    '⚠️ CONSIDER USING search_all INSTEAD: This only searches datasets. For comprehensive results across datasets and dashboards, use search_all tool. ⚠️',
    {
      query: z.string().describe('Search query to match against dataset metadata'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
    },
    async ({ query, limit = 20 }) => {
      try {
        const searchResults = rankDatasets(query, await getAllDatasets());
        const limitedResults = searchResults.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Search results for datasets (best match first)',
                query,
                total_matches: searchResults.length,
                showing: Math.min(limit, searchResults.length),
                datasets: limitedResults.map(({ dataset, score }) => ({ ...summarizeDataset(dataset), score })),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to search datasets',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Filter datasets by criteria
  server.tool(
    prefixToolName('filter_datasets_catalogue'),
    'Filter datasets by various criteria such as frequency, geography, etc. (use get_dataset_filters to see valid values)',
    {
      frequency: z.string().optional().describe('Filter by data frequency (e.g., DAILY, MONTHLY, ANNUAL)'),
      geography: z.array(z.string()).optional().describe('Filter by geographic coverage'),
      demography: z.array(z.string()).optional().describe('Filter by demographic coverage'),
      dataSource: z.array(z.string()).optional().describe('Filter by data source organization'),
      yearRange: z.array(z.number()).length(2).optional().describe('Filter by year range [start, end]'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ frequency, geography, demography, dataSource, yearRange, limit = 20, offset = 0 }) => {
      try {
        const datasets = await getAllDatasets();

        const filterCriteria = {
          frequency,
          geography,
          demography,
          dataSource,
          yearRange: yearRange as [number, number] | undefined
        };

        const filteredDatasets = filterDatasets(filterCriteria, datasets);
        const paginatedResults = filteredDatasets.slice(offset, offset + limit);
        const total = filteredDatasets.length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Filtered datasets',
                filters: filterCriteria,
                total_matches: total,
                showing: `${offset + 1}-${Math.min(offset + limit, total)} of ${total}`,
                pagination: {
                  limit,
                  offset,
                  next_offset: offset + limit < total ? offset + limit : null,
                  previous_offset: offset > 0 ? Math.max(0, offset - limit) : null,
                },
                datasets: paginatedResults.map(summarizeDataset),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to filter datasets',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Get available filter options
  server.tool(
    prefixToolName('get_dataset_filters'),
    'Get available filter options for datasets',
    {},
    async () => {
      try {
        const filters = buildFilterOptions(await getAllDatasets());

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Dataset filter options retrieved successfully',
                filters,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to retrieve filter options',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Get dataset details by ID
  server.tool(
    prefixToolName('get_dataset_details'),
    'Get comprehensive metadata for a dataset by ID',
    {
      id: z.string().describe('ID of the dataset to retrieve metadata for'),
    },
    async ({ id }) => {
      try {
        const dataset = await getDatasetById(id);

        if (!dataset) {
          // Try to find similar datasets for suggestion
          const allDatasets = await getAllDatasets();
          const similarDatasets = allDatasets
            .filter((d: DatasetMetadata) => d.id.includes(id) || id.includes(d.id))
            .map((d: DatasetMetadata) => ({ id: d.id, title_en: d.title_en }))
            .slice(0, 5);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Dataset '${id}' not found`,
                  suggestions: similarDatasets.length > 0 ? similarDatasets : undefined,
                  timestamp: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Dataset '${id}' details retrieved successfully`,
                dataset,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Failed to retrieve dataset '${id}'`,
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
