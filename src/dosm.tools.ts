import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';

// API Base URL for Malaysia Open Data API
const API_BASE_URL = 'https://api.data.gov.my';

// OpenDOSM endpoint - correct endpoint for Malaysia Open Data API
const OPENDOSM_ENDPOINT = '/opendosm';

export function registerDosmTools(server: McpServer) {
  // List DOSM datasets
  server.tool(
    prefixToolName('list_dosm_datasets'),
    'Lists available datasets from the Department of Statistics Malaysia',
    {
      dataset_id: z.string().optional().describe('Optional specific dataset ID to list (e.g., "cpi_core", "cpi_strata")'),
      limit: z.number().min(1).optional().describe('Maximum number of datasets to return'),
      offset: z.number().min(0).optional().describe('Number of datasets to skip'),
    },
    async ({ dataset_id, limit = 10, offset = 0 }) => {
      try {
        // Use the correct endpoint structure
        const url = `${API_BASE_URL}${OPENDOSM_ENDPOINT}`;
        // If dataset_id is provided, get specific dataset, otherwise list available datasets
        const params: Record<string, any> = { limit, meta: true };
        
        if (dataset_id) {
          params.id = dataset_id;
        }

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
              text: `Error fetching DOSM datasets: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get DOSM dataset
  server.tool(
    prefixToolName('get_dosm_dataset'),
    'Gets data from a specific DOSM dataset',
    {
      id: z.string().describe('ID of the dataset to retrieve (e.g., "cpi_core", "cpi_strata")'),
      limit: z.number().min(1).optional().describe('Maximum number of records to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip'),
    },
    async ({ id, limit = 10, offset = 0 }) => {
      try {
        // Use the correct endpoint structure with dataset ID as query parameter
        const url = `${API_BASE_URL}${OPENDOSM_ENDPOINT}`;
        const params = { id, limit, offset };

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
              text: `Error fetching DOSM dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
