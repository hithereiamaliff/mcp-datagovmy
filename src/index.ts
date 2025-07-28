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
import { prefixToolName } from './utils/tool-naming.js';

// Type definition for tool registration functions
type ToolRegistrationFn = (server: McpServer) => void;

// Define the config schema
export const configSchema = z.object({
  // Optional Google Maps API key for geocoding
  googleMapsApiKey: z.string()
    .optional()
    .describe('Google Maps API key for improved location detection. If not provided, will use OpenStreetMap Nominatim API as fallback.'),
  
  // Optional GrabMaps API key for Southeast Asia geocoding
  grabMapsApiKey: z.string()
    .optional()
    .describe('GrabMaps API key for improved geocoding in Southeast Asia.'),
  
  // Optional AWS credentials for GrabMaps integration via AWS Location Service
  awsRegion: z.string()
    .optional()
    .describe('AWS Region where your Place Index is created. Default: ap-southeast-5 (Malaysia)'),
  
  awsAccessKeyId: z.string()
    .optional()
    .describe('AWS Access Key ID with permissions to access AWS Location Service.'),
  
  awsSecretAccessKey: z.string()
    .optional()
    .describe('AWS Secret Access Key with permissions to access AWS Location Service.'),
});

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

  // Extract config values
  const { googleMapsApiKey, grabMapsApiKey, awsAccessKeyId, awsSecretAccessKey, awsRegion } = _config;
  
  // Set API keys in process.env if provided in config
  if (googleMapsApiKey) {
    process.env.GOOGLE_MAPS_API_KEY = googleMapsApiKey;
    console.log('Using Google Maps API key from configuration');
  }
  
  // Set GrabMaps API key
  if (grabMapsApiKey) {
    process.env.GRABMAPS_API_KEY = grabMapsApiKey;
    console.log('Using GrabMaps API key from configuration');
  }
  
  // Set AWS credentials for GrabMaps integration via AWS Location Service
  if (awsAccessKeyId) {
    process.env.AWS_ACCESS_KEY_ID = awsAccessKeyId;
    console.log('Using AWS Access Key ID from configuration');
  }
  
  if (awsSecretAccessKey) {
    process.env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey;
    console.log('Using AWS Secret Access Key from configuration');
  }
  
  if (awsRegion) {
    process.env.AWS_REGION = awsRegion;
    console.log(`Using AWS Region: ${awsRegion} from configuration`);
  }
  
  // Register all tool sets
  const toolSets: ToolRegistrationFn[] = [
    registerDataCatalogueTools,
    registerDosmTools,
    registerWeatherTools,
    registerDashboardTools,
    registerUnifiedSearchTools,
    registerParquetTools,
    registerGtfsTools,
    registerTransportTools,
    registerFloodTools,
  ];
  
  // Register all tools
  toolSets.forEach((toolSet) => toolSet(server));

  // Register a simple hello tool for testing
  server.tool(
    prefixToolName('hello'),
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

