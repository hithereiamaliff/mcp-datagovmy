import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { API_BASE_URL } from './config.js';
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
        const url = `${API_BASE_URL}${FLOOD_WARNING_ENDPOINT}`;
        const params: Record<string, any> = { meta: true };

        // Build filter params - combine multiple filters with comma separation
        const filters: string[] = [];
        if (state) filters.push(`${state}@state`);
        if (district) filters.push(`${district}@district`);
        if (severity) filters.push(`${severity}@severity`);
        if (filters.length > 0) {
          params.filter = filters.join(',');
        }

        const response = await axios.get(url, { params });

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
