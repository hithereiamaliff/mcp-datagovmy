/**
 * Malaysia Open Data MCP Server
 * Provides tools to access Malaysia's open data APIs
 *
 * Load environment variables from .env file
 */
import dotenv from 'dotenv';

// Initialize dotenv to load environment variables from .env file
dotenv.config();

/**
 * =====================================================================
 * IMPORTANT GUIDANCE FOR AI MODELS USING THIS MCP SERVER:
 * =====================================================================
 * 1. ALWAYS use the 'search_all' tool FIRST for any data queries
 *    This tool searches both datasets and dashboards simultaneously
 *    with intelligent fallback to ensure comprehensive results.
 * 
 * 2. Only use specific dataset or dashboard search tools if you need to
 *    explicitly limit your search to one type of content.
 *
 * 3. Use correct URL patterns:
 *    - https://data.gov.my/... for general data portal resources
 *    - https://open.dosm.gov.my/... for OpenDOSM resources
 *
 * 4. Parquet files can now be accessed and parsed using the 'parse_parquet_file'
 *    and 'get_parquet_info' tools. These tools use the hyparquet JavaScript library
 *    and are fully compatible with the Smithery deployment environment.
 * =====================================================================
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Import external tools
import { registerFloodTools } from './flood.tools.js';
import { registerWeatherTools } from './weather.tools.js';
import { registerTransportTools } from './transport.tools.js';
import { registerDataCatalogueTools } from './datacatalogue.tools.js';
import { registerDosmTools } from './dosm.tools.js';
import { registerDashboardTools } from './dashboards.tools.js';
import { registerUnifiedSearchTools } from './unified-search.tools.js';
import { registerParquetTools } from './parquet.tools.js';
import { registerGtfsTools } from './gtfs.tools.js';

// Type definition for tool registration functions
type ToolRegistrationFn = (server: McpServer) => void;

// Define the config schema
export const configSchema = z.object({});

/**
 * Creates a stateless MCP server for Malaysia Open Data API
 */
export default function createStatelessServer({
  config: _config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: 'Malaysia Open Data MCP Server',
    version: '1.0.0',
  });

  // Register Data Catalogue tools
  registerDataCatalogueTools(server);

  // Register DOSM tools
  registerDosmTools(server);

  // Register Weather tools
  registerWeatherTools(server);

  // Register Transport tools
  registerTransportTools(server);

  // Register Flood Warning tools
  registerFloodTools(server);

  // Register Dashboard tools
  registerDashboardTools(server);

  // Register Unified Search tools
  registerUnifiedSearchTools(server);

  // Register Parquet tools
  registerParquetTools(server);

  // Register GTFS parsing tools
  registerGtfsTools(server);

  // Register a simple hello tool for testing
  server.tool(
    'hello',
    'A simple test tool to verify that the MCP server is working correctly',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Hello from Malaysia Open Data MCP!',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  );

  return server.server;
}

// If this file is run directly, log a message
console.log('Malaysia Open Data MCP module loaded');

