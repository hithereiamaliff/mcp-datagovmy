/**
 * Malaysia Open Data MCP Server - Streamable HTTP Transport
 * 
 * This file provides an HTTP server for self-hosting the MCP server on a VPS.
 * It uses the Streamable HTTP transport for MCP communication.
 * 
 * Usage:
 *   npm run build
 *   node dist/http-server.js
 * 
 * Or with environment variables:
 *   PORT=8080 node dist/http-server.js
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// Import tool registration functions
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

// Configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Default API keys from environment
const DEFAULT_GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DEFAULT_GRABMAPS_API_KEY = process.env.GRABMAPS_API_KEY;
const DEFAULT_AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const DEFAULT_AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const DEFAULT_AWS_REGION = process.env.AWS_REGION || 'ap-southeast-5';

/**
 * Extract API keys from request query params or headers
 * User-provided keys take priority over default environment keys
 */
function extractApiKeys(req: Request): void {
  // Google Maps API key
  const googleMapsKey = req.query.googleMapsApiKey as string || 
                        req.headers['x-google-maps-api-key'] as string;
  if (googleMapsKey) {
    process.env.GOOGLE_MAPS_API_KEY = googleMapsKey;
    console.log('Using user-provided Google Maps API key');
  } else if (DEFAULT_GOOGLE_MAPS_API_KEY) {
    process.env.GOOGLE_MAPS_API_KEY = DEFAULT_GOOGLE_MAPS_API_KEY;
  }

  // GrabMaps API key
  const grabMapsKey = req.query.grabMapsApiKey as string || 
                      req.headers['x-grabmaps-api-key'] as string;
  if (grabMapsKey) {
    process.env.GRABMAPS_API_KEY = grabMapsKey;
    console.log('Using user-provided GrabMaps API key');
  } else if (DEFAULT_GRABMAPS_API_KEY) {
    process.env.GRABMAPS_API_KEY = DEFAULT_GRABMAPS_API_KEY;
  }

  // AWS credentials (for AWS Location Service / GrabMaps integration)
  const awsAccessKeyId = req.query.awsAccessKeyId as string || 
                         req.headers['x-aws-access-key-id'] as string;
  if (awsAccessKeyId) {
    process.env.AWS_ACCESS_KEY_ID = awsAccessKeyId;
    console.log('Using user-provided AWS Access Key ID');
  } else if (DEFAULT_AWS_ACCESS_KEY_ID) {
    process.env.AWS_ACCESS_KEY_ID = DEFAULT_AWS_ACCESS_KEY_ID;
  }

  const awsSecretAccessKey = req.query.awsSecretAccessKey as string || 
                             req.headers['x-aws-secret-access-key'] as string;
  if (awsSecretAccessKey) {
    process.env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey;
    console.log('Using user-provided AWS Secret Access Key');
  } else if (DEFAULT_AWS_SECRET_ACCESS_KEY) {
    process.env.AWS_SECRET_ACCESS_KEY = DEFAULT_AWS_SECRET_ACCESS_KEY;
  }

  const awsRegion = req.query.awsRegion as string || 
                    req.headers['x-aws-region'] as string;
  if (awsRegion) {
    process.env.AWS_REGION = awsRegion;
    console.log(`Using user-provided AWS Region: ${awsRegion}`);
  } else {
    process.env.AWS_REGION = DEFAULT_AWS_REGION;
  }
}

// Create MCP server
const mcpServer = new McpServer({
  name: 'Malaysia Open Data MCP Server',
  version: '1.0.0',
});

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
toolSets.forEach((toolSet) => toolSet(mcpServer));

// Register hello tool for testing
mcpServer.tool(
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
            transport: 'streamable-http',
          }, null, 2),
        },
      ],
    };
  }
);

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for MCP clients
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Mcp-Session-Id'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    server: 'Malaysia Open Data MCP',
    version: '1.0.0',
    transport: 'streamable-http',
    timestamp: new Date().toISOString(),
  });
});

// Create Streamable HTTP transport (stateless)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless transport
});

// MCP endpoint - handles POST (requests), GET (SSE), DELETE (session close)
app.all('/mcp', async (req: Request, res: Response) => {
  try {
    // Extract API keys from query params or headers (user's keys take priority)
    extractApiKeys(req);
    
    // Log request info
    console.log('Received MCP request:', {
      method: req.method,
      path: req.path,
      hasGoogleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
      hasGrabMapsKey: !!process.env.GRABMAPS_API_KEY,
      hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    });
    
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: 'Internal server error' 
        },
        id: null,
      });
    }
  }
});

// Root endpoint with server info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Malaysia Open Data MCP Server',
    version: '1.0.0',
    description: 'MCP server for Malaysia Open Data APIs (data.gov.my, OpenDOSM, weather, transport)',
    transport: 'streamable-http',
    endpoints: {
      mcp: '/mcp',
      health: '/health',
    },
    apiKeySupport: {
      description: 'You can provide your own API keys via URL query params or headers',
      queryParams: {
        googleMapsApiKey: 'Google Maps API key for geocoding',
        grabMapsApiKey: 'GrabMaps API key for Southeast Asia geocoding',
        awsAccessKeyId: 'AWS Access Key ID for AWS Location Service',
        awsSecretAccessKey: 'AWS Secret Access Key',
        awsRegion: 'AWS Region (default: ap-southeast-5)',
      },
      headers: {
        'X-Google-Maps-Api-Key': 'Google Maps API key',
        'X-GrabMaps-Api-Key': 'GrabMaps API key',
        'X-AWS-Access-Key-Id': 'AWS Access Key ID',
        'X-AWS-Secret-Access-Key': 'AWS Secret Access Key',
        'X-AWS-Region': 'AWS Region',
      },
      example: '/mcp?googleMapsApiKey=YOUR_KEY',
      important: 'GrabMaps requires ALL FOUR params: grabMapsApiKey + awsAccessKeyId + awsSecretAccessKey + awsRegion. Without any one of these, GrabMaps will not work.',
    },
    documentation: 'https://github.com/hithereiamaliff/mcp-datagovmy',
  });
});

// Connect server to transport and start listening
mcpServer.server.connect(transport)
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log('='.repeat(60));
      console.log('🇲🇾 Malaysia Open Data MCP Server (Streamable HTTP)');
      console.log('='.repeat(60));
      console.log(`📍 Server running on http://${HOST}:${PORT}`);
      console.log(`📡 MCP endpoint: http://${HOST}:${PORT}/mcp`);
      console.log(`❤️  Health check: http://${HOST}:${PORT}/health`);
      console.log('='.repeat(60));
      console.log('');
      console.log('Test with MCP Inspector:');
      console.log(`  npx @modelcontextprotocol/inspector`);
      console.log(`  Select "Streamable HTTP" and enter: http://localhost:${PORT}/mcp`);
      console.log('');
    });
  })
  .catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
