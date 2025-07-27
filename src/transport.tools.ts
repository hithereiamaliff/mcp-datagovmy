import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

// API Base URL for Malaysia Open Data API
const API_BASE_URL = 'https://api.data.gov.my';

// GTFS endpoints - correct endpoints for Malaysia Open Data API
const DATA_CATALOGUE_ENDPOINT = '/data-catalogue';
const GTFS_STATIC_ENDPOINT = '/gtfs-static';
const GTFS_REALTIME_ENDPOINT = '/gtfs-realtime';

export function registerTransportTools(server: McpServer) {
  // List transport agencies
  server.tool(
    'list_transport_agencies',
    'Lists available transport agencies with GTFS data',
    {
      limit: z.number().min(1).optional().describe('Maximum number of agencies to return'),
      offset: z.number().min(0).optional().describe('Number of agencies to skip'),
    },
    async ({ limit = 10, offset = 0 }) => {
      try {
        // Using data catalogue to list GTFS datasets
        const url = `${API_BASE_URL}${DATA_CATALOGUE_ENDPOINT}`;
        const params: Record<string, any> = { 
          limit,
          meta: true,
          contains: 'gtfs' // Search for GTFS datasets
        };

        const response = await axios.get(url, { params });
        const data = response.data;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching transport agencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get transport data
  server.tool(
    'get_transport_data',
    'Gets GTFS data for a specific transport agency',
    {
      dataset_id: z.string().describe('ID of the GTFS dataset (e.g., "gtfs_rapidkl", "gtfs_prasarana")'),
      limit: z.number().min(1).optional().describe('Maximum number of records to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip'),
    },
    async ({ dataset_id, limit = 10, offset = 0 }) => {
      try {
        const url = `${API_BASE_URL}${DATA_CATALOGUE_ENDPOINT}`;
        const params = { id: dataset_id, limit, offset };

        const response = await axios.get(url, { params });
        const data = response.data;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching transport data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // GTFS Static API
  server.tool(
    'get_gtfs_static',
    'Gets GTFS static data for a specific transport provider',
    {
      provider: z.string().describe('Provider name (e.g., "rapidkl", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      limit: z.number().min(1).optional().describe('Maximum number of records to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip'),
    },
    async ({ provider, category, limit = 10, offset = 0 }) => {
      try {
        // Use the GTFS static endpoint with provider as path parameter
        const url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
        const params: Record<string, any> = { meta: true };
        
        if (provider === 'prasarana' && !category) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Category parameter is required for prasarana provider',
                }, null, 2),
              },
            ],
          };
        }
        
        if (category) {
          params.category = category;
        }

        // In a real implementation, this would download a ZIP file
        // For now, return the URL that would be used
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `GTFS static data URL for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                url,
                params,
                note: 'This endpoint returns a ZIP file in the actual implementation'
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
                error: 'Failed to get GTFS static data',
                message: error instanceof Error ? error.message : 'Unknown error',
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // GTFS Realtime API
  server.tool(
    'get_gtfs_realtime_vehicle_position',
    'Gets GTFS realtime vehicle position data for a specific transport provider',
    {
      provider: z.string().describe('Provider name (e.g., "rapidkl", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      limit: z.number().min(1).optional().describe('Maximum number of records to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip'),
    },
    async ({ provider, category, limit = 10, offset = 0 }) => {
      try {
        // Use the GTFS realtime endpoint with provider as path parameter
        const url = `${API_BASE_URL}${GTFS_REALTIME_ENDPOINT}/${provider}`;
        const params: Record<string, any> = { meta: true };
        
        if (provider === 'prasarana' && !category) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Category parameter is required for prasarana provider',
                }, null, 2),
              },
            ],
          };
        }
        
        if (category) {
          params.category = category;
        }

        // In a real implementation, this would return a Protocol Buffer file
        // For now, return the URL that would be used
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `GTFS realtime vehicle position data URL for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                url,
                params,
                note: 'This endpoint returns a Protocol Buffer file in the actual implementation'
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
                error: 'Failed to get GTFS realtime data',
                message: error instanceof Error ? error.message : 'Unknown error',
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
