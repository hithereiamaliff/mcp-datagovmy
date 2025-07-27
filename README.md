# Malaysia Open Data MCP

MCP (Model Context Protocol) server for Malaysia's Open Data APIs, providing easy access to government datasets and collections.

Do note that this is **NOT** an official MCP server by the Government of Malaysia or anyone from Malaysia's Open Data/Jabatan Digital Negara/Ministry of Digital team.

## Features

- **Unified Search** across both datasets and dashboards with intelligent fallback
- Access to Malaysia's Data Catalogue with rich metadata
- Interactive Dashboards for data visualization
- Department of Statistics Malaysia (DOSM) data integration
- Weather forecast and warnings from Malaysian Meteorological Department
- Public transport data access

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
3. **Be aware of data format limitations** - Raw files like parquet cannot be directly accessed
4. **Use the hybrid approach** - Static indexes for listing/searching, API calls for details

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

### Weather

- `get_weather_forecast`: Gets weather forecast for Malaysia
- `get_weather_warnings`: Gets current weather warnings for Malaysia
- `get_earthquake_warnings`: Gets earthquake warnings for Malaysia

### Transport

- `list_transport_agencies`: Lists available transport agencies with GTFS data
- `get_transport_data`: Gets GTFS data for a specific transport agency

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

## API Rate Limits

Please be aware of rate limits for the underlying APIs. Excessive requests may be throttled.

## License

MIT - See [LICENSE](./LICENSE) file for details.

A simplified Model Context Protocol (MCP) server for accessing Malaysia's Open Data APIs, designed specifically for easy deployment to Smithery.

## Features

- Standalone, self-contained implementation
- No complex configuration files
- Docker-ready for Smithery deployment
- Built for reliability and simplicity

## Available Tools

This simplified version includes placeholder implementations for:

- `hello`: Simple test tool to verify server functionality
- `list_datasets`: List available datasets in the Data Catalogue
- `get_dataset`: Get data from a specific dataset
- Plus other tools defined in the smithery.yaml file

## Quick Start

```bash
# Clone the repository
git clone https://github.com/hithereiamaliff/mcp-datagovmy.git
cd mcp-datagovmy

# Install dependencies
npm install

# Start the server locally
npm start
```

## Smithery Deployment

This MCP server is designed for direct deployment to Smithery via their web interface:

1. Push your code to GitHub
2. Visit https://smithery.ai/new
3. Connect your GitHub repository
4. Select the repository and branch
5. Deploy

The server will be built and deployed automatically, bypassing any local Windows path issues.

## Project Structure

- `index.js`: Self-contained MCP server implementation
- `Dockerfile`: Simplified Docker configuration for Smithery
- `smithery.yaml`: Smithery configuration
- `package.json`: Minimal dependencies

## Local Testing

To test locally before deploying to Smithery:

```bash
# Start the server
node index.js

# In another terminal, test the hello tool
curl -X POST http://localhost:8182/invoke/hello -H "Content-Type: application/json" -d "{}"
```

## Troubleshooting

### Deployment Issues

If you encounter deployment issues:

1. Ensure your GitHub repository is public or properly connected to Smithery
2. Verify that your `Dockerfile` and `smithery.yaml` are in the repository root
3. Check that the `index.js` file exports a valid MCP server function

## License

MIT

## Acknowledgments

- [Malaysia Open Data Portal](https://data.gov.my/)
- [Department of Statistics Malaysia](https://open.dosm.gov.my/)
- [Malaysian Meteorological Department](https://www.met.gov.my/)
- [Smithery](https://smithery.ai/) for the MCP framework
