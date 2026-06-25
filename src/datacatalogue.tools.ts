import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { tokenizeQuery, expandSearchTerms } from './utils/search.js';
import { getDatasets } from './utils/github-index.js';
import { GITHUB_RAW_BASE_URL, CACHE_TTL as CONFIG_CACHE_TTL } from './config.js';

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

// Cache for detailed dataset metadata (individual file fetches)
let detailsCache: Record<string, DatasetMetadata> = {};
let filtersCache: DatasetFilterOptions | null = null;
let lastDetailsCacheUpdate: number = 0;
const CACHE_TTL = CONFIG_CACHE_TTL;

// Helper function to get all datasets (now async, fetches live from GitHub)
export async function getAllDatasets(): Promise<DatasetMetadata[]> {
  return getDatasets();
}

// Fetch filters from GitHub (only needed once)
async function fetchFilters(): Promise<DatasetFilterOptions> {
  if (filtersCache !== null && Date.now() - lastDetailsCacheUpdate < CACHE_TTL) {
    return filtersCache;
  }

  try {
    const filtersResponse = await axios.get<DatasetFilterOptions>(`${GITHUB_RAW_BASE_URL}/filters.json`);
    filtersCache = filtersResponse.data;
    lastDetailsCacheUpdate = Date.now();
    return filtersCache;
  } catch (error) {
    console.error('Error fetching filters:', error);
    if (filtersCache !== null) {
      return filtersCache; // Return stale cache if available
    }
    throw new Error('Failed to fetch filters and no cache available');
  }
}

// Helper function to get detailed dataset by ID
async function getDatasetById(id: string): Promise<DatasetMetadata | null> {
  // Check if we have detailed info cached and it's not expired
  if (detailsCache[id] && Date.now() - lastDetailsCacheUpdate < CACHE_TTL) {
    return detailsCache[id];
  }

  // Check the index for basic info
  const datasets = await getAllDatasets();
  const basicInfo = datasets.find(d => d.id === id);

  // Always try to fetch full details from GitHub
  try {
    const response = await axios.get(`${GITHUB_RAW_BASE_URL}/${id}.json`);
    const detailedData = { ...response.data, id } as DatasetMetadata;

    detailsCache[id] = detailedData;
    lastDetailsCacheUpdate = Date.now();

    return detailedData;
  } catch (error: unknown) {
    console.warn(`Error fetching dataset ${id} from GitHub:`, getErrorMessage(error));
    // Fall back to basic info from index if available
    return basicInfo || null;
  }
}

// Helper function to search datasets with improved matching
export async function searchDatasets(query: string): Promise<DatasetMetadata[]> {
  const datasets = await getAllDatasets();

  // Tokenize the query
  const queryTerms = tokenizeQuery(query);
  const expandedTerms = queryTerms.flatMap(term => expandSearchTerms(term));

  // If we have no valid terms after tokenization, fall back to the original query
  if (expandedTerms.length === 0) {
    const lowerCaseQuery = query.toLowerCase();
    return datasets.filter(d =>
      d.title_en.toLowerCase().includes(lowerCaseQuery) ||
      d.title_ms.toLowerCase().includes(lowerCaseQuery) ||
      d.description_en.toLowerCase().includes(lowerCaseQuery) ||
      d.description_ms.toLowerCase().includes(lowerCaseQuery) ||
      d.id.toLowerCase().includes(lowerCaseQuery)
    );
  }

  // Search using expanded terms
  return datasets.filter(d => {
    const title_en = d.title_en.toLowerCase();
    const title_ms = d.title_ms.toLowerCase();
    const desc_en = d.description_en.toLowerCase();
    const desc_ms = d.description_ms.toLowerCase();
    const id = d.id.toLowerCase();

    return expandedTerms.some(term =>
      title_en.includes(term) ||
      title_ms.includes(term) ||
      desc_en.includes(term) ||
      desc_ms.includes(term) ||
      id.includes(term)
    );
  });
}

// Helper function to filter datasets
function filterDatasets(filters: DatasetFilterCriteria, datasets: DatasetMetadata[]): DatasetMetadata[] {
  return datasets.filter(d => {
    if (filters.frequency && d.frequency !== filters.frequency) return false;
    if (filters.geography && filters.geography.length > 0 && !filters.geography.some((g: string) => d.geography.includes(g))) return false;
    if (filters.demography && filters.demography.length > 0 && !filters.demography.some((dem: string) => d.demography.includes(dem))) return false;
    if (filters.dataSource && filters.dataSource.length > 0 && !filters.dataSource.some((ds: string) => d.data_source.includes(ds))) return false;
    if (filters.yearRange && d.dataset_begin !== undefined && d.dataset_end !== undefined &&
        (d.dataset_begin > filters.yearRange[1] || d.dataset_end < filters.yearRange[0])) return false;
    return true;
  });
}

export function registerDataCatalogueTools(server: McpServer) {
  // List all datasets with rich metadata
  server.tool(
    prefixToolName('list_datasets_catalogue'),
    'Lists all datasets from the comprehensive catalogue with rich metadata',
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
                datasets: paginatedDatasets,
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
        const searchResults = await searchDatasets(query);
        const limitedResults = searchResults.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Search results for datasets',
                query,
                total_matches: searchResults.length,
                showing: Math.min(limit, searchResults.length),
                datasets: limitedResults,
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
    'Filter datasets by various criteria such as frequency, geography, etc.',
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
                datasets: paginatedResults,
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
        const filters = await fetchFilters();

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
