import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { tokenizeQuery, expandSearchTerms } from './utils/search.js';
import { getDashboards } from './utils/github-index.js';
import { GITHUB_DASHBOARDS_URL, CACHE_TTL as CONFIG_CACHE_TTL } from './config.js';

// Re-export the interface for consumers
export type { DashboardMetadata } from './utils/github-index.js';
import type { DashboardMetadata } from './utils/github-index.js';

interface DashboardChart {
  name?: string;
  chart_type?: string;
  chart_source?: string;
  data_as_of?: string;
  api_type?: string;
  api_params?: unknown;
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

// GitHub raw content base URL for fetching specific dashboards
const GITHUB_RAW_BASE_URL = GITHUB_DASHBOARDS_URL;

// Cache for detailed dashboard metadata (individual file fetches)
let detailsCache: Record<string, DashboardMetadata> = {};
let lastDetailsCacheUpdate: number = 0;
const CACHE_TTL = CONFIG_CACHE_TTL;

// Get all dashboards (now async, fetches live from GitHub)
export async function getAllDashboards(): Promise<DashboardMetadata[]> {
  return getDashboards();
}

// Helper function to get dashboard by name
async function getDashboardByName(name: string): Promise<DashboardMetadata | null> {
  // Check if we have detailed info cached and it's not expired
  if (detailsCache[name] && Date.now() - lastDetailsCacheUpdate < CACHE_TTL) {
    return detailsCache[name];
  }

  // Check the index for basic info
  const dashboards = await getAllDashboards();
  const basicInfo = dashboards.find(d => {
    return d.dashboard_name === name ||
           (d.route && d.route.replace(/\//g, '_') === name);
  });

  // Always try to fetch full details from GitHub
  try {
    const response = await axios.get(`${GITHUB_RAW_BASE_URL}/${name}.json`);
    const detailedData = {
      ...response.data,
      dashboard_name: response.data.dashboard_name || name,
    } as DashboardMetadata;

    detailsCache[name] = detailedData;
    lastDetailsCacheUpdate = Date.now();

    return detailedData;
  } catch (error: unknown) {
    console.warn(`Error fetching dashboard ${name} from GitHub:`, getErrorMessage(error));
    // Fall back to basic info from index if available
    return basicInfo || null;
  }
}

// Helper function to search dashboards with improved matching
export async function searchDashboards(query: string): Promise<DashboardMetadata[]> {
  const dashboards = await getAllDashboards();

  // Tokenize the query
  const queryTerms = tokenizeQuery(query);
  const expandedTerms = queryTerms.flatMap(term => expandSearchTerms(term));

  // If we have no valid terms after tokenization, fall back to the original query
  if (expandedTerms.length === 0) {
    const lowerCaseQuery = query.toLowerCase();
    return dashboards.filter(d =>
      d.dashboard_name.toLowerCase().includes(lowerCaseQuery) ||
      (d.route && d.route.toLowerCase().includes(lowerCaseQuery))
    );
  }

  // Search using expanded terms
  return dashboards.filter(d => {
    const name = d.dashboard_name.toLowerCase();
    const route = d.route ? d.route.toLowerCase() : '';

    return expandedTerms.some(term =>
      name.includes(term) || route.includes(term)
    );
  });
}

export function registerDashboardTools(server: McpServer) {
  // List all available dashboards
  server.tool(
    prefixToolName('list_dashboards'),
    'Lists all available dashboards from the Malaysia Open Data platform',
    {
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ limit = 20, offset = 0 }) => {
      try {
        const allDashboards = await getAllDashboards();
        const paginatedDashboards = allDashboards.slice(offset, offset + limit);
        const total = allDashboards.length;

        const simplifiedDashboards = paginatedDashboards.map(d => ({
          dashboard_name: d.dashboard_name,
          route: d.route,
          sites: d.sites,
          data_last_updated: d.data_last_updated,
          required_params: d.required_params,
          chart_count: d.charts ? Object.keys(d.charts as Record<string, unknown>).length : 0
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Dashboards retrieved successfully',
                total_dashboards: total,
                showing: `${offset + 1}-${Math.min(offset + limit, total)} of ${total}`,
                pagination: {
                  limit,
                  offset,
                  next_offset: offset + limit < total ? offset + limit : null,
                  previous_offset: offset > 0 ? Math.max(0, offset - limit) : null,
                },
                dashboards: simplifiedDashboards,
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
                error: 'Failed to retrieve dashboards',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Search dashboards by query
  server.tool(
    prefixToolName('search_dashboards'),
    '⚠️ CONSIDER USING search_all INSTEAD: This only searches dashboards. For comprehensive results across datasets and dashboards, use search_all tool. ⚠️',
    {
      query: z.string().describe('Search query to match against dashboard metadata'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
    },
    async ({ query, limit = 20 }) => {
      try {
        const searchResults = await searchDashboards(query);
        const limitedResults = searchResults.slice(0, limit);

        const simplifiedResults = limitedResults.map(d => ({
          dashboard_name: d.dashboard_name,
          route: d.route,
          sites: d.sites,
          data_last_updated: d.data_last_updated,
          required_params: d.required_params,
          chart_count: d.charts ? Object.keys(d.charts as Record<string, unknown>).length : 0
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Search results for dashboards',
                query,
                total_matches: searchResults.length,
                showing: Math.min(limit, searchResults.length),
                dashboards: simplifiedResults,
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
                error: 'Failed to search dashboards',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Get dashboard details by name
  server.tool(
    prefixToolName('get_dashboard_details'),
    'Get comprehensive metadata for a dashboard by name',
    {
      name: z.string().describe('Name of the dashboard to retrieve metadata for'),
    },
    async ({ name }) => {
      try {
        const dashboard = await getDashboardByName(name);

        if (!dashboard) {
          const allDashboards = await getAllDashboards();
          const similarDashboards = allDashboards
            .filter(d => d.dashboard_name.includes(name) || name.includes(d.dashboard_name))
            .map(d => ({ dashboard_name: d.dashboard_name, route: d.route }))
            .slice(0, 5);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Dashboard '${name}' not found`,
                  suggestions: similarDashboards.length > 0 ? similarDashboards : undefined,
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
                message: `Dashboard '${name}' details retrieved successfully`,
                dashboard,
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
                error: `Failed to retrieve dashboard '${name}'`,
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Get charts for a dashboard
  server.tool(
    prefixToolName('get_dashboard_charts'),
    'Get chart configurations for a specific dashboard',
    {
      name: z.string().describe('Name of the dashboard to retrieve charts for'),
    },
    async ({ name }) => {
      try {
        const dashboard = await getDashboardByName(name);

        if (!dashboard) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Dashboard '${name}' not found`,
                  timestamp: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }

        if (!dashboard.charts) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `No charts found for dashboard '${name}'`,
                  timestamp: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }

        const charts = dashboard.charts as Record<string, DashboardChart>;
        const chartList = Object.entries(charts).map(([key, chart]) => ({
          chart_id: key,
          name: chart.name,
          type: chart.chart_type,
          source: chart.chart_source,
          data_as_of: chart.data_as_of,
          api_type: chart.api_type,
          api_params: chart.api_params
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Charts for dashboard '${name}' retrieved successfully`,
                dashboard_name: dashboard.dashboard_name,
                route: dashboard.route,
                chart_count: chartList.length,
                charts: chartList,
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
                error: `Failed to retrieve charts for dashboard '${name}'`,
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
