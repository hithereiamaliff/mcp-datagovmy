import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

// Import the pre-generated catalogue index
import { CATALOGUE_INDEX } from '../scripts/catalogue-index.js';

// GitHub raw content base URL for fetching specific datasets
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue';

// Define dataset metadata interface
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
  [key: string]: any;
}

// Cache for detailed dataset metadata
let detailsCache: Record<string, DatasetMetadata> = {};
let filtersCache: any = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Helper function to get all datasets
export function getAllDatasets(): DatasetMetadata[] {
  return CATALOGUE_INDEX as DatasetMetadata[];
}

// Fetch filters from GitHub (only needed once)
async function fetchFilters(): Promise<any> {
  if (filtersCache !== null && Date.now() - lastCacheUpdate < CACHE_TTL) {
    return filtersCache;
  }
  
  try {
    const filtersResponse = await axios.get(`${GITHUB_RAW_BASE_URL}/filters.json`);
    filtersCache = filtersResponse.data;
    lastCacheUpdate = Date.now();
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
  // First check if we have it in the index
  const basicInfo = getAllDatasets().find(d => d.id === id);
  if (!basicInfo) {
    return null; // Dataset ID not found in index
  }
  
  // If we have detailed info cached, return it
  if (detailsCache[id] && Date.now() - lastCacheUpdate < CACHE_TTL) {
    return detailsCache[id];
  }
  
  // Otherwise fetch detailed info from GitHub
  try {
    const response = await axios.get(`${GITHUB_RAW_BASE_URL}/${id}.json`);
    const detailedData = response.data as DatasetMetadata;
    
    // Cache the detailed data
    detailsCache[id] = detailedData;
    lastCacheUpdate = Date.now();
    
    return detailedData;
  } catch (error) {
    console.error(`Error fetching dataset ${id}:`, error);
    // If we can't get detailed data, return the basic info from the index
    return basicInfo;
  }
}

// Helper function to search datasets
export function searchDatasets(query: string): DatasetMetadata[] {
  const datasets = getAllDatasets();
  const lowerCaseQuery = query.toLowerCase();
  return datasets.filter(d => 
    d.title_en.toLowerCase().includes(lowerCaseQuery) ||
    d.title_ms.toLowerCase().includes(lowerCaseQuery) ||
    d.description_en.toLowerCase().includes(lowerCaseQuery) ||
    d.description_ms.toLowerCase().includes(lowerCaseQuery) ||
    d.id.toLowerCase().includes(lowerCaseQuery)
  );
}

// Helper function to filter datasets
function filterDatasets(filters: any, datasets: DatasetMetadata[]): DatasetMetadata[] {
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
    'list_datasets_catalogue',
    'Lists all datasets from the comprehensive catalogue with rich metadata',
    {
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ limit = 20, offset = 0 }) => {
      try {
        const datasets = getAllDatasets();
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
    'search_datasets_catalogue',
    'Search datasets by keywords in title or description',
    {
      query: z.string().describe('Search query to match against dataset metadata'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
    },
    async ({ query, limit = 20 }) => {
      try {
        const searchResults = searchDatasets(query);
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
    'filter_datasets_catalogue',
    'Filter datasets by various criteria such as frequency, geography, etc.',
    {
      frequency: z.string().optional().describe('Filter by data frequency (e.g., DAILY, MONTHLY, ANNUAL)'),
      geography: z.array(z.string()).optional().describe('Filter by geographic coverage'),
      demography: z.array(z.string()).optional().describe('Filter by demographic coverage'),
      dataSource: z.array(z.string()).optional().describe('Filter by data source organization'),
      yearRange: z.tuple([z.number(), z.number()]).optional().describe('Filter by year range [start, end]'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ frequency, geography, demography, dataSource, yearRange, limit = 20, offset = 0 }) => {
      try {
        const datasets = getAllDatasets();
        const filters = await fetchFilters();
        
        // Apply filters
        const filterCriteria = {
          frequency,
          geography,
          demography,
          dataSource,
          yearRange
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
    'get_dataset_filters',
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
    'get_dataset_details',
    'Get comprehensive metadata for a dataset by ID',
    {
      id: z.string().describe('ID of the dataset to retrieve metadata for'),
    },
    async ({ id }) => {
      try {
        const dataset = await getDatasetById(id);
        
        if (!dataset) {
          // Try to find similar datasets for suggestion
          const allDatasets = getAllDatasets();
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
