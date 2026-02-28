# Malaysia Open Data MCP

**MCP Endpoint:** `https://mcp.techmavie.digital/datagovmy/mcp`

**Analytics Dashboard:** [`https://mcp.techmavie.digital/datagovmy/analytics/dashboard`](https://mcp.techmavie.digital/datagovmy/analytics/dashboard)

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
  - Intelligent date field handling for empty date objects
  - Increased row limits (up to 500 rows) for comprehensive data retrieval
  - Fallback to metadata estimation when parsing fails
  - Automatic dashboard URL mapping for visualization
- **Live Data Access Architecture**
  - Real-time index fetching from GitHub (data-gov-my/datagovmy-meta)
  - In-memory caching with configurable TTL
  - Dynamic API calls for detailed metadata
- **Multi-Provider Geocoding**
  - Support for Google Maps, GrabMaps, and Nominatim (OpenStreetMap)
  - Intelligent service selection based on location and available API keys
  - GrabMaps optimization for locations in Malaysia
  - Automatic fallback between providers
- **Comprehensive Data Sources**
  - Malaysia's Data Catalogue with rich metadata
  - Interactive Dashboards for data visualization
  - Department of Statistics Malaysia (DOSM) data
  - Weather forecast and warnings
  - Public transport and GTFS data
- **Multi-Provider Malaysian Geocoding**
  - Optimized for Malaysian addresses and locations
  - Three-tier geocoding system: GrabMaps, Google Maps, and Nominatim
  - Prioritizes local knowledge with GrabMaps for better Malaysian coverage
  - Automatic fallback to Nominatim when no API keys are provided

## Architecture

This MCP server fetches dataset and dashboard metadata live from the [data-gov-my/datagovmy-meta](https://github.com/data-gov-my/datagovmy-meta) GitHub repository:

- **Live GitHub Indexes** — On first tool call, fetches all dataset and dashboard metadata via the GitHub Trees API and raw content URLs
- **In-Memory Caching** — Indexes are cached in memory with a configurable TTL (default: 1 hour), so subsequent requests are fast
- **Dynamic Detail Fetching** — Individual dataset/dashboard details are fetched on-demand from GitHub raw content

This approach provides several benefits:
- Always up-to-date with the latest datasets and dashboards
- No static data that goes stale
- Consistent data access patterns
- Graceful handling of GitHub downtime

## Documentation

- **[TOOLS.md](./TOOLS.md)** - Detailed information about available tools and best practices
- **[PROMPT.md](./PROMPT.md)** - AI integration guidelines and usage patterns

## AI Integration

When integrating this MCP server with AI models:

1. **Use the unified search tool first** - Always start with `search_all` for any data queries
2. **Follow the correct URL patterns** - Use `https://data.gov.my/...` and `https://open.dosm.gov.my/...`
3. **Leverage Parquet file tools** - Use `parse_parquet_file` to access data directly or `get_parquet_info` for metadata
4. **Live indexes** - Dataset and dashboard indexes are fetched live from GitHub and cached in memory
5. **Consider dashboard visualization** - For complex data, use the dashboard links provided by `find_dashboard_for_parquet`
6. **Leverage the multi-provider Malaysian geocoding** - For Malaysian location queries, the system automatically selects the best provider (GrabMaps, Google Maps, or Nominatim) with fallback to Nominatim when no API keys are configured

Refer to [PROMPT.md](./PROMPT.md) for comprehensive AI integration guidelines.

## Installation

```bash
npm install
```

## Quick Start (Hosted Server)

The easiest way to use this MCP server is via the hosted endpoint. **No installation required!**

**Server URL:**
```
https://mcp.techmavie.digital/datagovmy/mcp
```

#### Using Your Own API Keys

You can provide your own API keys via URL query parameters:

```
https://mcp.techmavie.digital/datagovmy/mcp?googleMapsApiKey=YOUR_KEY
```

Or via headers:
- `X-Google-Maps-Api-Key: YOUR_KEY`
- `X-GrabMaps-Api-Key: YOUR_KEY`
- `X-AWS-Access-Key-Id: YOUR_KEY`
- `X-AWS-Secret-Access-Key: YOUR_KEY`
- `X-AWS-Region: ap-southeast-5`

**Supported Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `googleMapsApiKey` | Google Maps API key for geocoding |
| `grabMapsApiKey` | GrabMaps API key for Southeast Asia geocoding |
| `awsAccessKeyId` | AWS Access Key ID for AWS Location Service |
| `awsSecretAccessKey` | AWS Secret Access Key |
| `awsRegion` | AWS Region (default: ap-southeast-5) |

> **⚠️ Important: GrabMaps Requirements**
> 
> To use GrabMaps geocoding, you need **ALL FOUR** parameters:
> - `grabMapsApiKey`
> - `awsAccessKeyId`
> - `awsSecretAccessKey`
> - `awsRegion`
> 
> GrabMaps uses AWS Location Service under the hood, so AWS credentials are required alongside the GrabMaps API key.

### Client Configuration

For Claude Desktop / Cursor / Windsurf, add to your MCP configuration:

```json
{
  "mcpServers": {
    "malaysia-opendata": {
      "transport": "streamable-http",
      "url": "https://mcp.techmavie.digital/datagovmy/mcp"
    }
  }
}
```

With your own API key:
```json
{
  "mcpServers": {
    "malaysia-opendata": {
      "transport": "streamable-http",
      "url": "https://mcp.techmavie.digital/datagovmy/mcp?googleMapsApiKey=YOUR_KEY"
    }
  }
}
```

## Self-Hosted (VPS)

If you prefer to run your own instance, see [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) for detailed VPS deployment instructions with Docker and Nginx.

## Analytics Dashboard

The hosted server includes a built-in analytics dashboard:

**Dashboard URL:** [`https://mcp.techmavie.digital/datagovmy/analytics/dashboard`](https://mcp.techmavie.digital/datagovmy/analytics/dashboard)

### Analytics Endpoints

| Endpoint | Description |
|----------|-------------|
| `/analytics` | Full analytics summary (JSON) |
| `/analytics/tools` | Detailed tool usage stats (JSON) |
| `/analytics/dashboard` | Visual dashboard with charts (HTML) |

The dashboard tracks:
- Total requests and tool calls
- Tool usage distribution
- Hourly request trends (last 24 hours)
- Requests by endpoint
- Top clients by user agent
- Recent tool calls feed

Auto-refreshes every 30 seconds.

## Available Tools

### Unified Search

- `search_all`: **Primary search tool** — searches across both datasets and dashboards with intelligent fallback and scoring

### Data Catalogue

- `list_datasets_catalogue`: Lists available datasets in the Data Catalogue
- `search_datasets_catalogue`: Searches datasets in the Data Catalogue
- `filter_datasets_catalogue`: Filters datasets by frequency, geography, demography, data source, or year range
- `get_dataset_details`: Gets metadata/details for a specific dataset
- `get_dataset_filters`: Gets available filter options for datasets

### Dashboards

- `list_dashboards`: Lists all available dashboards
- `search_dashboards`: Searches dashboards by query
- `get_dashboard_details`: Gets comprehensive metadata for a dashboard
- `get_dashboard_charts`: Gets chart configurations for a specific dashboard

### Department of Statistics Malaysia (DOSM)

- `list_dosm_datasets`: Lists available datasets from DOSM
- `get_dosm_dataset`: Gets data from a specific DOSM dataset

### Parquet File Handling

- `parse_parquet_file`: Parse and display data from a Parquet file URL
  - Supports up to 500 rows for comprehensive data analysis
  - Automatically handles empty date objects with appropriate formatting
  - Processes BigInt values for proper JSON serialization
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

### Flood Warnings

- `get_flood_warnings`: Gets current flood warnings for Malaysia, filterable by state, district, and severity

### Test

- `hello`: A simple test tool to verify that the MCP server is working correctly

## Data-Catalogue Information Retrieval

The MCP server provides robust handling for data-catalogue information retrieval:

### Date Handling in Parquet Files

- **Empty Date Objects**: The system automatically detects and handles empty date objects in parquet files
- **Dataset-Specific Handling**: Special handling for known datasets like `employment_sector` with annual data from 2001-2022
- **Pattern Recognition**: Detects date patterns in existing data to maintain consistent formatting
- **Increased Row Limits**: Supports up to 500 rows (increased from 100) for more comprehensive data analysis

### BigInt Processing

- **Automatic Serialization**: BigInt values are automatically converted to strings for proper JSON serialization
- **Type Preservation**: Original types are preserved in the schema information

### Schema Detection

- **Automatic Type Inference**: Detects column types including special handling for date fields
- **Consistent Representation**: Ensures date fields are consistently represented as strings

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
const result = await tools.search_datasets_catalogue({
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

```
src/
├── index.ts                  # Main MCP server (stdio transport)
├── http-server.ts            # Streamable HTTP server for VPS deployment
├── config.ts                 # Centralized configuration (API URLs, cache TTLs, timeouts)
├── firebase-analytics.ts     # Firebase analytics persistence
├── datacatalogue.tools.ts    # Data Catalogue search and listing tools
├── dashboards.tools.ts       # Dashboard search and listing tools
├── unified-search.tools.ts   # Unified search across datasets and dashboards
├── dosm.tools.ts             # Department of Statistics Malaysia tools
├── parquet.tools.ts          # Parquet file parsing and metadata tools
├── weather.tools.ts          # Weather forecast and warnings tools
├── transport.tools.ts        # Transport and GTFS data tools
├── gtfs.tools.ts             # GTFS parsing and geocoding tools
├── flood.tools.ts            # Flood warning and monitoring tools
└── utils/
    ├── github-index.ts       # Live GitHub index fetcher (Trees API + raw content)
    ├── search.ts             # Shared search utilities (tokenization, synonyms)
    └── tool-naming.ts        # Tool name prefixing utility

deploy/                       # Deployment files (nginx config, deployment guide)
Dockerfile                    # Docker configuration for VPS deployment
docker-compose.yml            # Docker Compose configuration
```

## Local Development

```bash
# Install dependencies
npm install

# Run HTTP server in development mode
npm run dev:http

# Or build and run production version
npm run build
npm run start:http

# Test health endpoint
curl http://localhost:8080/health

# Test MCP endpoint
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Troubleshooting

### Container Issues

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f

# Restart container
docker compose restart
```

### Test MCP Connection

```bash
# List tools
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call hello tool
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"datagovmy_hello","arguments":{}}}'
```

## Configuration

### Environment Variables

This project supports the following configuration options:

**Server Configuration**:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `API_BASE_URL` | `https://api.data.gov.my` | Malaysia Open Data API base URL |
| `CACHE_TTL` | `3600000` | Cache time-to-live in ms (default: 1 hour) |
| `AXIOS_TIMEOUT` | `30000` | HTTP request timeout in ms (default: 30s) |
| `GITHUB_FETCH_BATCH_SIZE` | `20` | Concurrent file fetches when loading indexes from GitHub |
| `GH_PAT` | � | Optional GitHub PAT for higher API rate limits (60/hr anonymous vs 5000/hr authenticated). Recommended for production. |
| `ANALYTICS_RESET_KEY` | — | Secret key required for `/analytics/reset` and `/analytics/import` endpoints |
| `FIREBASE_DATABASE_URL` | — | Firebase Realtime Database URL for analytics persistence |
| `FIREBASE_CREDENTIALS_PATH` | `.credentials/firebase-service-account.json` | Path to Firebase service account credentials |

**Geocoding Credentials (Optional. Only for GTFS Transit Features Usage)**:

The following credentials are **only needed if you plan to use the GTFS transit tools** that require geocoding services. Other features like data catalogue access, weather forecasts, and DOSM data do not require these credentials.

- **googleMapsApiKey**: Optional. If provided, the system will use Google Maps API for geocoding location names to coordinates.
- **grabMapsApiKey**: Optional. Required for GrabMaps geocoding, which is optimized for locations in Malaysia.
- **awsAccessKeyId**: Required for GrabMaps integration. AWS access key for GrabMaps API authentication.
- **awsSecretAccessKey**: Required for GrabMaps integration. AWS secret key for GrabMaps API authentication.
- **awsRegion**: Required for GrabMaps integration. AWS region for GrabMaps API (e.g. 'ap-southeast-5' for Malaysia region or ap-southeast-1 for Singapore region).

If neither Google Maps nor GrabMaps API keys are provided, the GTFS transit tools will automatically fall back to using Nominatim (OpenStreetMap) API for geocoding, which is free and doesn't require credentials.

You can set these configuration options in two ways:

1. **Via URL query parameters** when connecting to the hosted server (see Quick Start section)
2. **As environment variables** for local development or self-hosted deployment

#### Setting up environment variables

Create a `.env` file in the root directory:

```env
GOOGLE_MAPS_API_KEY=your_google_api_key_here
GRABMAPS_API_KEY=your_grab_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key_for_grabmaps
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_for_grabmaps
AWS_REGION=ap-southeast-5
```

The variables will be automatically loaded when you run the server.

**Note:** For Malaysian locations, GrabMaps provides the most accurate geocoding results, followed by Google Maps. If you don't provide either API key, the system will automatically use Nominatim API instead, which is free but may have less accurate results for some locations in Malaysia.

**Important:** These geocoding credentials are only required for the following GTFS transit tools:
- `get_transit_routes` - When converting location names to coordinates
- `get_transit_stops` - When converting location names to coordinates
- `parse_gtfs_static` - When geocoding is needed for stop locations

**Note about GTFS Realtime Tools:** The `parse_gtfs_realtime` tool is currently in development and has limited availability. Real-time data access through this MCP is experimental and may not be available for all providers or routes. For up-to-date train and bus schedules, bus locations, and arrivals in real-time, please use official transit apps like Google Maps, MyRapid PULSE, Moovit, or Lugo.

All other tools like data catalogue access, dashboard search, weather forecasts, and DOSM data do not require any geocoding credentials.

## License

MIT - See [LICENSE](./LICENSE) file for details.

## Acknowledgments

- [Malaysia Open Data Portal](https://data.gov.my/)
- [Department of Statistics Malaysia](https://open.dosm.gov.my/)
- [Malaysian Meteorological Department](https://www.met.gov.my/)
- [Google Maps Platform](https://developers.google.com/maps) for geocoding
- [GrabMaps](https://grabmaps.grab.com/solutions/service-apis) for geocoding
- [Nominatim](https://nominatim.org/) for geocoding
- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP framework

