# Malaysia Open Data MCP

[![smithery badge](https://smithery.ai/badge/@hithereiamaliff/mcp-datagovmy)](https://smithery.ai/server/@hithereiamaliff/mcp-datagovmy)

MCP (Model Context Protocol) server for Malaysia's Open Data APIs, providing easy access to government datasets and collections.

Do note that this is **NOT** an official MCP server by the Government of Malaysia or anyone from Malaysia's Open Data/Jabatan Digital Negara/Ministry of Digital team.

## Features

- **Enhanced Unified Search** with flexible tokenization and synonym expansion
  - Intelligent query handling with term normalization
  - Support for plurals and common prefixes (e.g., "e" in "epayment")
  - Smart prioritization for different data types
- **Parquet File Support** using pure JavaScript
  - Parse Parquet files directly in the browser or Node.js
  - Support for BROTLI compression
  - Fallback to metadata estimation when parsing fails
  - Automatic dashboard URL mapping for visualization
- **Hybrid Data Access Architecture**
  - Pre-generated static indexes for efficient searching
  - Dynamic API calls for detailed metadata
- **Comprehensive Data Sources**
  - Malaysia's Data Catalogue with rich metadata
  - Interactive Dashboards for data visualization
  - Department of Statistics Malaysia (DOSM) data
  - Weather forecast and warnings
  - Public transport and GTFS data

## Architecture

This MCP server implements a hybrid approach for efficient data access:

- **Pre-generated Static Indexes** for listing and searching datasets and dashboards
- **Dynamic API Calls** only when specific dataset or dashboard details are requested

This approach provides several benefits:
- Faster search and listing operations
- Reduced API calls to external services
- Consistent data access patterns
- Up-to-date detailed information when needed

## Documentation

- **[TOOLS.md](./TOOLS.md)** - Detailed information about available tools and best practices
- **[PROMPT.md](./PROMPT.md)** - AI integration guidelines and usage patterns

## AI Integration

When integrating this MCP server with AI models:

1. **Use the unified search tool first** - Always start with `search_all` for any data queries
2. **Follow the correct URL patterns** - Use `https://data.gov.my/...` and `https://open.dosm.gov.my/...`
3. **Leverage Parquet file tools** - Use `parse_parquet_file` to access data directly or `get_parquet_info` for metadata
4. **Use the hybrid approach** - Static indexes for listing/searching, API calls for details
5. **Consider dashboard visualization** - For complex data, use the dashboard links provided by `find_dashboard_for_parquet`

Refer to [PROMPT.md](./PROMPT.md) for comprehensive AI integration guidelines.

## Installation

```bash
npm install
```

## Development

To run the MCP server in development mode:

```bash
npx @smithery/cli dev
```

## Build

To build the MCP server for deployment:

```bash
npx @smithery/cli build
```

## Deployment

This MCP is designed to be deployed to Smithery. Follow these steps to deploy:

1. Make sure you have the Smithery CLI installed:
   ```bash
   npm install -g @smithery/cli
   ```

2. Build the project:
   ```bash
   npx @smithery/cli build
   ```

3. Deploy to Smithery:
   ```bash
   npx @smithery/cli deploy
   ```

## Available Tools

### Data Catalogue

- `list_datasets`: Lists available datasets in the Data Catalogue
- `get_dataset`: Gets data from a specific dataset in the Data Catalogue
- `search_datasets`: Searches for datasets in the Data Catalogue

### Department of Statistics Malaysia (DOSM)

- `list_dosm_datasets`: Lists available datasets from DOSM
- `get_dosm_dataset`: Gets data from a specific DOSM dataset

### Parquet File Handling

- `parse_parquet_file`: Parse and display data from a Parquet file URL
- `get_parquet_info`: Get metadata and structure information about a Parquet file
- `find_dashboard_for_parquet`: Find the corresponding dashboard URL for a Parquet file

### Weather

- `get_weather_forecast`: Gets weather forecast for Malaysia
- `get_weather_warnings`: Gets current weather warnings for Malaysia
- `get_earthquake_warnings`: Gets earthquake warnings for Malaysia

### Transport

- `list_transport_agencies`: Lists available transport agencies with GTFS data
- `get_transport_data`: Gets GTFS data for a specific transport agency

### GTFS Parsing

- `parse_gtfs_static`: Parses GTFS Static data (ZIP files with CSV data) for a specific transport provider
- `parse_gtfs_realtime`: Parses GTFS Realtime data (Protocol Buffer format) for vehicle positions
- `get_transit_routes`: Extracts route information from GTFS data
- `get_transit_stops`: Extracts stop information from GTFS data, optionally filtered by route

### Test

- `hello`: A simple test tool to verify that the MCP server is working correctly

## Usage Examples

### Get Weather Forecast

```javascript
const result = await tools.get_weather_forecast({
  location: "Kuala Lumpur",
  days: 3
});
```

### Search Datasets

```javascript
const result = await tools.search_datasets({
  query: "population",
  limit: 5
});
```

### Parse GTFS Data

```javascript
// Parse GTFS Static data
const staticData = await tools.parse_gtfs_static({
  provider: "ktmb"
});

// Get real-time vehicle positions
const realtimeData = await tools.parse_gtfs_realtime({
  provider: "prasarana",
  category: "rapid-rail-kl"
});

// Get transit routes
const routes = await tools.get_transit_routes({
  provider: "mybas-johor"
});

// Get stops for a specific route
const stops = await tools.get_transit_stops({
  provider: "prasarana",
  category: "rapid-rail-kl",
  route_id: "LRT-KJ"
});
```

## API Rate Limits

Please be aware of rate limits for the underlying APIs. Excessive requests may be throttled.

## Project Structure

- `src/index.ts`: Main MCP server implementation and tool registration
- `src/datacatalogue.tools.ts`: Data Catalogue API tools
- `src/dashboards.tools.ts`: Dashboard access and search tools
- `src/dosm.tools.ts`: Department of Statistics Malaysia tools
- `src/unified-search.tools.ts`: Enhanced unified search with tokenization and synonym expansion
- `src/parquet.tools.ts`: Parquet file parsing and metadata tools
- `src/weather.tools.ts`: Weather forecast and warnings tools
- `src/transport.tools.ts`: Transport and GTFS data tools
- `src/gtfs.tools.ts`: GTFS parsing and analysis tools
- `src/flood.tools.ts`: Flood warning and monitoring tools
- `Dockerfile`: Docker configuration for Smithery
- `smithery.yaml`: Smithery configuration
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript configuration

## Local Testing

To test locally before deploying to Smithery:

```bash
# Start the development server
npm run dev

# Or build and run the production version
npm run build
npm start

# In another terminal, test the hello tool
curl -X POST http://localhost:8182/invoke/hello -H "Content-Type: application/json" -d "{}"
```

You can also use the Smithery CLI for local development:

```bash
# Run in development mode
npx @smithery/cli dev

# Build for production
npx @smithery/cli build
```

## Troubleshooting

### Deployment Issues

If you encounter deployment issues:

1. Ensure your GitHub repository is public or properly connected to Smithery
2. Verify that your `Dockerfile` and `smithery.yaml` are in the repository root
3. Check that the `index.js` file exports a valid MCP server function

## License

MIT - See [LICENSE](./LICENSE) file for details.

## Configuration

### Environment Variables

This project supports the following environment variables:

- **GOOGLE_MAPS_API_KEY**: Optional. If provided, the GTFS transit tools will use Google Maps API for geocoding location names to coordinates. If not provided, the system will automatically fall back to using Nominatim (OpenStreetMap) API for geocoding.

#### Setting up environment variables

**For local development:**

The project uses `dotenv` to load environment variables from a `.env` file during development.

1. Create a `.env` file in the root directory with the following content:
```
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

2. The variables will be automatically loaded when you run the server locally using `npm run dev`

**For Smithery deployment:**

Add the environment variable in the Smithery dashboard:
1. Go to your project in the Smithery dashboard
2. Navigate to the environment variables section
3. Add a new variable with key `GOOGLE_MAPS_API_KEY` and your API key as the value

**Note:** Google Maps API provides better geocoding results for many locations in Malaysia compared to Nominatim, but requires an API key. If you don't provide a Google Maps API key, the system will automatically use Nominatim API instead, which is free but may have less accurate results for some locations.

## Acknowledgments

- [Malaysia Open Data Portal](https://data.gov.my/)
- [Department of Statistics Malaysia](https://open.dosm.gov.my/)
- [Malaysian Meteorological Department](https://www.met.gov.my/)
- [Google Maps Platform](https://developers.google.com/maps) for geocoding services
- [Smithery](https://smithery.ai/) for the MCP framework
