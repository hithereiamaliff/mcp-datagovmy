import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Import the pre-generated dashboards index
import { DASHBOARDS_INDEX } from '../scripts/dashboards-index.js';

// Define dashboard metadata interface
export interface DashboardMetadata {
  dashboard_name: string;
  data_last_updated?: string;
  data_next_update?: string;
  route?: string;
  sites?: string[];
  required_params?: string[];
  optional_params?: string[];
  charts?: Record<string, any>;
  [key: string]: any;
}

// GitHub raw content base URL for fetching specific dashboards
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/dashboards';

// Local dashboards directory path
const dashboardsDir = path.join(process.cwd(), 'dashboards');

// Cache for detailed dashboard metadata
let detailsCache: Record<string, DashboardMetadata> = {};
let lastCacheUpdate: number = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Get all dashboards from the pre-generated index
export function getAllDashboards(): DashboardMetadata[] {
  return DASHBOARDS_INDEX as DashboardMetadata[];
}

// Helper function to get dashboard by name
async function getDashboardByName(name: string): Promise<DashboardMetadata | null> {
  // First check if we have it in the index
  const basicInfo = getAllDashboards().find(d => {
    // Check if dashboard_name matches or if the filename (without .json) matches
    return d.dashboard_name === name || 
           (d.route && d.route.replace(/\//g, '_') === name);
  });
  
  if (!basicInfo) {
    return null; // Dashboard not found in index
  }
  
  // If we have detailed info cached, return it
  if (detailsCache[name] && Date.now() - lastCacheUpdate < CACHE_TTL) {
    return detailsCache[name];
  }
  
  try {
    // First check if we have it locally
    const filePath = path.join(dashboardsDir, `${name}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content) as DashboardMetadata;
      
      // Cache the detailed data
      detailsCache[name] = data;
      lastCacheUpdate = Date.now();
      
      return data;
    }
    
    // If not found locally, try to fetch from GitHub
    const response = await axios.get(`${GITHUB_RAW_BASE_URL}/${name}.json`);
    const detailedData = response.data as DashboardMetadata;
    
    // Cache the detailed data
    detailsCache[name] = detailedData;
    lastCacheUpdate = Date.now();
    
    return detailedData;
  } catch (error) {
    console.error(`Error getting dashboard ${name}:`, error);
    // If we can't get detailed data, return the basic info from the index
    return basicInfo;
  }
}

// Helper function to search dashboards
export function searchDashboards(query: string): DashboardMetadata[] {
  const dashboards = getAllDashboards();
  const lowerCaseQuery = query.toLowerCase();
  return dashboards.filter(d => 
    d.dashboard_name.toLowerCase().includes(lowerCaseQuery) ||
    (d.route && d.route.toLowerCase().includes(lowerCaseQuery))
  );
}

export function registerDashboardTools(server: McpServer) {
  // List all available dashboards
  server.tool(
    'list_dashboards',
    'Lists all available dashboards from the Malaysia Open Data platform',
    {
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ limit = 20, offset = 0 }) => {
      try {
        const allDashboards = getAllDashboards();
        const paginatedDashboards = allDashboards.slice(offset, offset + limit);
        const total = allDashboards.length;
        
        // Create a simplified version of the dashboards for the response
        const simplifiedDashboards = paginatedDashboards.map(d => ({
          dashboard_name: d.dashboard_name,
          route: d.route,
          sites: d.sites,
          data_last_updated: d.data_last_updated,
          required_params: d.required_params,
          chart_count: d.charts ? Object.keys(d.charts).length : 0
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
    'search_dashboards',
    'Search dashboards by keywords in name or route',
    {
      query: z.string().describe('Search query to match against dashboard metadata'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
    },
    async ({ query, limit = 20 }) => {
      try {
        const searchResults = searchDashboards(query);
        const limitedResults = searchResults.slice(0, limit);
        
        // Create a simplified version of the dashboards for the response
        const simplifiedResults = limitedResults.map(d => ({
          dashboard_name: d.dashboard_name,
          route: d.route,
          sites: d.sites,
          data_last_updated: d.data_last_updated,
          required_params: d.required_params,
          chart_count: d.charts ? Object.keys(d.charts).length : 0
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
    'get_dashboard_details',
    'Get comprehensive metadata for a dashboard by name',
    {
      name: z.string().describe('Name of the dashboard to retrieve metadata for'),
    },
    async ({ name }) => {
      try {
        const dashboard = await getDashboardByName(name);
        
        if (!dashboard) {
          // Try to find similar dashboards for suggestion
          const allDashboards = getAllDashboards();
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
    'get_dashboard_charts',
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
        
        const charts = dashboard.charts;
        const chartList = Object.entries(charts).map(([key, chart]) => {
          const chartObj = chart as any;
          return {
            chart_id: key,
            name: chartObj.name,
            type: chartObj.chart_type,
            source: chartObj.chart_source,
            data_as_of: chartObj.data_as_of,
            api_type: chartObj.api_type,
            api_params: chartObj.api_params
          };
        });
        
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
