/**
 * Malaysia Open Data MCP - Smithery Entry Point
 * 
 * This is a simplified entry point specifically for Smithery deployment.
 */

// Import the server function
const server = require('./src/index.js');

// Export the server function directly
module.exports = server;
module.exports.default = server;
