/**
 * Malaysia Open Data MCP - Container Entry Point
 * 
 * This script provides a non-interactive entry point for the MCP server
 * when running in a containerized environment.
 */

// Import the server function
const server = require('./src/index.js');
const config = require('./smithery.config.cjs');

// Get port from environment or use default
const PORT = process.env.PORT || 8182;

// Create an HTTP server to handle requests
const http = require('http');
const url = require('url');

// Initialize the MCP server with configuration
const mcpServer = server({ 
  sessionId: 'container-session',
  config: config
});

// Connect to get the tools
const tools = mcpServer.connect();

// Create HTTP server
const httpServer = http.createServer(async (req, res) => {
  // Set CORS headers if enabled
  if (config.cors) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // Only handle POST requests to /invoke
  if (req.method === 'POST' && req.url.startsWith('/invoke')) {
    try {
      // Parse the URL to get the tool name
      const parsedUrl = url.parse(req.url, true);
      const pathParts = parsedUrl.pathname.split('/');
      const toolName = pathParts[2]; // /invoke/toolName
      
      if (!toolName || !tools[toolName]) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Tool '${toolName}' not found` }));
        return;
      }

      // Get request body for parameters
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          // Parse parameters
          const params = body ? JSON.parse(body) : {};
          
          // Call the tool with parameters
          const result = await tools[toolName](params);
          
          // Return the result
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (error) {
          console.error(`Error processing tool ${toolName}:`, error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
        }
      });
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.method === 'GET' && req.url === '/') {
    // Root endpoint with info
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: config.name || 'datagovmy-mcp',
      displayName: config.displayName || 'Malaysia Open Data MCP',
      description: config.description || 'MCP server for accessing Malaysia\'s Open Data APIs',
      version: config.version || '1.0.0',
      tools: Object.keys(tools)
    }));
  } else {
    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Malaysia Open Data MCP server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down Malaysia Open Data MCP server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
