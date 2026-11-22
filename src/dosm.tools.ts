import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prefixToolName } from './utils/tool-naming.js';
import { API_BASE_URL } from './config.js';
import { fetchApiRows, describeApiError } from './utils/api.js';
import { getAllDatasets } from './datacatalogue.tools.js';
import type { DatasetMetadata } from './utils/github-index.js';

// OpenDOSM endpoint - correct endpoint for Malaysia Open Data API
const OPENDOSM_ENDPOINT = '/opendosm';

/** True if the catalogue lists this dataset on OpenDOSM (open.dosm.gov.my). */
function isOpenDosmDataset(d: DatasetMetadata): boolean {
  return Array.isArray(d.site_category) &&
    d.site_category.some(c => (c as { site?: unknown } | null)?.site === 'opendosm');
}

const textResult = (text: string) => ({ content: [{ type: 'text' as const, text }] });

export function registerDosmTools(server: McpServer) {
  // List DOSM datasets
  server.tool(
    prefixToolName('list_dosm_datasets'),
    'Lists datasets published by the Department of Statistics Malaysia (OpenDOSM). If dataset_id is given, returns rows from that dataset instead.',
    {
      dataset_id: z.string().optional().describe('Optional specific dataset ID to list (e.g., "cpi_core", "cpi_strata")'),
      limit: z.number().min(1).optional().describe('Maximum number of datasets to return'),
      offset: z.number().min(0).optional().describe('Number of datasets to skip'),
    },
    async ({ dataset_id, limit = 10, offset = 0 }) => {
      try {
        if (dataset_id) {
          // Same as get_dosm_dataset: rows from one dataset
          const rows = await fetchApiRows(`${API_BASE_URL}${OPENDOSM_ENDPOINT}`, { id: dataset_id }, limit, offset);
          return textResult(JSON.stringify({ dataset_id, offset, limit, count: rows.length, data: rows }, null, 2));
        }

        // The API has no "list" call (it answers 400 "Query parameter 'id' is
        // required"), so list the OpenDOSM datasets from the data catalogue instead.
        const dosmDatasets = (await getAllDatasets()).filter(isOpenDosmDataset);
        const total = dosmDatasets.length;
        const page = dosmDatasets.slice(offset, offset + limit);

        return textResult(JSON.stringify({
          message: 'OpenDOSM datasets. Use get_dosm_dataset with an id to fetch its rows.',
          total_datasets: total,
          showing: `${Math.min(offset + 1, total)}-${Math.min(offset + limit, total)} of ${total}`,
          next_offset: offset + limit < total ? offset + limit : null,
          datasets: page.map(d => ({
            id: d.id,
            title_en: d.title_en,
            frequency: d.frequency,
            last_updated: d.last_updated,
            url: `https://open.dosm.gov.my/data-catalogue/${d.id}`,
          })),
        }, null, 2));
      } catch (error) {
        return textResult(`Error fetching DOSM datasets: ${describeApiError(error)}`);
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
        // fetchApiRows makes `offset` work (the API itself ignores it)
        const rows = await fetchApiRows(`${API_BASE_URL}${OPENDOSM_ENDPOINT}`, { id }, limit, offset);
        return textResult(JSON.stringify(rows, null, 2));
      } catch (error) {
        return textResult(`Error fetching DOSM dataset: ${describeApiError(error)}`);
      }
    }
  );
}
