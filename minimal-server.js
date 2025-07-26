/**
 * Minimal MCP Server Implementation
 * This is a simplified version designed to work with Smithery deployment
 */

// Define a simple hello tool
const hello = async () => {
  return {
    message: "Hello from Malaysia Open Data MCP!",
    timestamp: new Date().toISOString()
  };
};

// Export the server function
module.exports = function server({ sessionId, config }) {
  // Define minimal tools
  const tools = {
    hello
  };
  
  // Return the connect method
  return {
    connect: () => tools
  };
};

// Also export as default
module.exports.default = module.exports;
