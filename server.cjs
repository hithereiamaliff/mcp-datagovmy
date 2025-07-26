/**
 * Malaysia Open Data MCP - CommonJS Server Entry Point
 * 
 * This file serves as a CommonJS-compatible entry point for the Smithery MCP server.
 */

// Import tools
const catalogueTools = require('./src/tools/catalogue');
const dosmTools = require('./src/tools/dosm');
const weatherTools = require('./src/tools/weather');
const transportTools = require('./src/tools/transport');
const testTools = require('./src/tools/test');

// Define the server function that Smithery expects
function server({ sessionId, config }) {
  // Define all the tools
  const tools = {
    // Data Catalogue Tools
    list_datasets: catalogueTools.listDatasets,
    get_dataset: catalogueTools.getDataset,
    search_datasets: catalogueTools.searchDatasets,
    
    // OpenDOSM Tools
    list_dosm_datasets: dosmTools.listDatasets,
    get_dosm_dataset: dosmTools.getDataset,
    
    // Weather Tools
    get_weather_forecast: weatherTools.getForecast,
    get_weather_warnings: weatherTools.getWarnings,
    get_earthquake_warnings: weatherTools.getEarthquakeWarnings,
    
    // Transport Tools
    list_transport_agencies: transportTools.listAgencies,
    get_transport_data: transportTools.getData,
    
    // Test Tools
    hello: testTools.hello,
  };
  
  // Return an object with a connect method that returns the tools
  return {
    connect: () => tools
  };
}

// Export the server function for CommonJS
module.exports = server;
module.exports.default = server;
