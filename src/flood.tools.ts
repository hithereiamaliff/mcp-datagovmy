import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';

// Base URL for Malaysia Open Data API
const API_BASE_URL = 'https://api.data.gov.my';
const FLOOD_WARNING_ENDPOINT = '/flood-warning';

/**
 * Register flood warning tools with the MCP server
 * @param server MCP server instance
 */
export function registerFloodTools(server: McpServer) {
  server.tool(
    prefixToolName('get_flood_warnings'),
    'Gets current flood warnings for Malaysia',
    {
      state: z.string().optional().describe('State name to filter warnings (e.g., "Selangor", "Johor")'),
      district: z.string().optional().describe('District name to filter warnings'),
      severity: z.string().optional().describe('Severity level to filter (e.g., "warning", "alert", "danger")'),
    },
    async ({ state, district, severity }) => {
      try {
        // Make a real API call to the Malaysia Open Data API
        const url = `${API_BASE_URL}${FLOOD_WARNING_ENDPOINT}`;
        const params: Record<string, any> = { meta: true };
        
        // Only add parameters if they are provided
        if (state) params.filter = `${state}@state`;
        if (district) params.filter = `${district}@district`;
        if (severity) params.filter = `${severity}@severity`;
        
        const response = await axios.get(url, { params });
        
        // Return the actual API response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Flood warnings retrieved successfully',
                params: { state, district, severity },
                endpoint: `${API_BASE_URL}${FLOOD_WARNING_ENDPOINT}`,
                warnings: response.data,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching flood warnings:', error);
        
        // If the API is unavailable, fall back to mock data for demonstration
        if (axios.isAxiosError(error) && (error.code === 'ECONNREFUSED' || error.response?.status === 404)) {
          console.warn('API unavailable, using mock data');
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: 'API unavailable, using mock data',
                  params: { state, district, severity },
                  endpoint: `${API_BASE_URL}${FLOOD_WARNING_ENDPOINT}`,
                  warnings: [
                    {
                      id: 'mock-flood-1',
                      state: 'Selangor',
                      district: 'Klang',
                      location: 'Taman Sri Muda',
                      severity: 'warning',
                      water_level: '3.5m',
                      timestamp: new Date().toISOString()
                    },
                    {
                      id: 'mock-flood-2',
                      state: 'Johor',
                      district: 'Kluang',
                      location: 'Kampung Contoh',
                      severity: 'danger',
                      water_level: '4.2m',
                      timestamp: new Date().toISOString()
                    }
                  ],
                  note: 'This is mock data as the real API is currently unavailable'
                }, null, 2),
              },
            ],
          };
        }
        
        // Return error information
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch flood warnings',
                message: error instanceof Error ? error.message : 'Unknown error',
                status: axios.isAxiosError(error) ? error.response?.status : undefined,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
