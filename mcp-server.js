/**
 * Malaysia Open Data MCP - Universal Server Entry Point
 * 
 * This file is a self-contained, simplified entry point designed for robust deployment on Smithery.
 */

// All tool logic is included here to avoid pathing issues.
const catalogueTools = {
  listDatasets: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
  getDataset: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
  searchDatasets: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
};

const dosmTools = {
  listDatasets: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
  getDataset: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
};

const weatherTools = {
  getForecast: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
  getWarnings: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
  getEarthquakeWarnings: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
};

const transportTools = {
  listAgencies: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
  getData: async (params) => ({ message: 'Tool not fully implemented in this version', ...params }),
};

const testTools = {
  hello: async () => ({ message: 'Hello from the simplified MCP server!' }),
};

/**
 * Main server function that Smithery expects.
 */
function server({ sessionId, config }) {
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
  
  return {
    connect: () => tools,
  };
}

// Export the server function for CommonJS compatibility.
module.exports = server;
module.exports.default = server;
