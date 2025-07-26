/**
 * Malaysia Open Data MCP - Simplified Server
 * 
 * A completely standalone MCP server implementation designed for direct deployment to Smithery.
 * This file contains everything needed to run the server without external dependencies.
 */

// Define our tools
const tools = {
  // Simple test tool
  hello: async () => {
    return {
      message: "Hello from Malaysia Open Data MCP!",
      timestamp: new Date().toISOString()
    };
  },
  
  // Data Catalogue Tools
  list_datasets: async ({ limit = 10, offset = 0 }) => {
    return {
      message: "This is a placeholder for the list_datasets tool",
      params: { limit, offset },
      datasets: [
        { id: "dataset-1", name: "Economic Indicators" },
        { id: "dataset-2", name: "Population Statistics" },
        { id: "dataset-3", name: "Education Metrics" }
      ]
    };
  },
  
  get_dataset: async ({ id, limit = 10, offset = 0, filter = "" }) => {
    return {
      message: `This is a placeholder for the get_dataset tool with ID: ${id}`,
      params: { id, limit, offset, filter },
      data: [
        { year: 2023, value: 100 },
        { year: 2024, value: 120 },
        { year: 2025, value: 150 }
      ]
    };
  },
  
  // Add more tool implementations as needed...
};

/**
 * Main MCP server function
 */
function server({ sessionId }) {
  console.log(`Starting MCP server session: ${sessionId}`);
  
  return {
    connect: () => tools
  };
}

// Export for Smithery compatibility
module.exports = server;
module.exports.default = server;

// If this file is run directly, start an HTTP server
if (require.main === module) {
  const http = require('http');
  const PORT = process.env.PORT || 8182;
  
  const httpServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Root endpoint
    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'datagovmy-mcp-hithereiamaliff',
        displayName: 'Malaysia Open Data MCP',
        description: 'MCP server for accessing Malaysia\'s Open Data APIs',
        version: '1.0.0',
        tools: Object.keys(tools)
      }));
      return;
    }
    
    // Handle tool invocation
    if (req.url.startsWith('/invoke/') && req.method === 'POST') {
      const toolName = req.url.split('/')[2];
      
      if (!tools[toolName]) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Tool '${toolName}' not found` }));
        return;
      }
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const params = body ? JSON.parse(body) : {};
          const result = await tools[toolName](params);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (error) {
          console.error(`Error processing tool ${toolName}:`, error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
        }
      });
      return;
    }
    
    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  httpServer.listen(PORT, () => {
    console.log(`Malaysia Open Data MCP server running on port ${PORT}`);
  });
}
