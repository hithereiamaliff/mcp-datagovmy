[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/hithereiamaliff-mcp-datagovmy-badge.png)](https://mseep.ai/app/hithereiamaliff-mcp-datagovmy)

# Malaysia Open Data MCP

**MCP Endpoint:** `https://mcp.techmavie.digital/datagovmy/mcp`

**Analytics Dashboard:** [`https://mcp.techmavie.digital/datagovmy/analytics/dashboard`](https://mcp.techmavie.digital/datagovmy/analytics/dashboard)

MCP (Model Context Protocol) server for Malaysia's open data APIs, with tools for datasets, dashboards, DOSM, weather, floods, parquet files, and GTFS transit data.

This is **not** an official MCP server from the Government of Malaysia, Jabatan Digital Negara, or the Ministry of Digital.

## Features

- Unified search across datasets and dashboards
- Live metadata fetching from [`data-gov-my/datagovmy-meta`](https://github.com/data-gov-my/datagovmy-meta)
- Pure JavaScript parquet parsing with raw, summary, and latest-period modes
- GTFS static and realtime transit tools
- Zero-credential geocoding for GTFS location search
- Built-in analytics endpoints and dashboard

### Geocoding

GTFS location search now uses **Nominatim (OpenStreetMap) only**.

- No Google Maps, GrabMaps, or AWS credentials are required
- The hosted MCP URL works as-is with zero credentials
- Requests are throttled and cached to be friendlier to the public Nominatim service
- Self-hosted operators can optionally set `NOMINATIM_CONTACT_EMAIL`

## Quick Start

### Hosted server

Use the hosted endpoint directly:

```text
https://mcp.techmavie.digital/datagovmy/mcp
```

Example MCP client config:

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

No API keys or geocoding credentials are needed.

### Self-hosted

Detailed VPS instructions live in [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md).

```bash
npm install
npm run build
npm run start:http
```

## Tool Overview

### Search and metadata

- `search_all`
- `list_datasets_catalogue`
- `search_datasets_catalogue`
- `filter_datasets_catalogue`
- `get_dataset_filters`
- `get_dataset_details`
- `list_dashboards`
- `search_dashboards`
- `get_dashboard_details`
- `get_dashboard_charts`
- `list_dosm_datasets`
- `get_dosm_dataset`

### Files and dashboards

- `parse_parquet_file`
- `get_parquet_info`
- `find_dashboard_for_parquet`

### Weather and floods

- `get_weather_forecast`
- `get_weather_warnings`
- `get_earthquake_warnings`
- `get_flood_warnings`

### Transport and GTFS

- `list_transport_agencies`
- `get_transport_data`
- `get_gtfs_static`
- `get_gtfs_realtime_vehicle_position`
- `parse_gtfs_static`
- `parse_gtfs_realtime`
- `get_transit_routes`
- `get_transit_stops`
- `get_transit_arrivals`
- `search_transit_stops_by_location`
- `find_nearest_transit_stops`

### Misc

- `hello`

More detail and usage guidance lives in [TOOLS.md](./TOOLS.md) and [PROMPT.md](./PROMPT.md).

## Local Development

```bash
# Install dependencies
npm install

# Run the HTTP server in development mode
npm run dev:http

# Build and run the production server locally
npm run build
npm run start:http

# Verify the server
curl http://localhost:8080/health
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Analytics

The hosted server exposes:

- `/analytics` for JSON stats
- `/analytics/tools` for tool usage stats
- `/analytics/dashboard` for the HTML dashboard

## Configuration

### Core environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address |
| `API_BASE_URL` | `https://api.data.gov.my` | Malaysia Open Data API base URL |
| `CACHE_TTL` | `3600000` | Metadata cache TTL in ms |
| `AXIOS_TIMEOUT` | `30000` | HTTP timeout in ms |
| `GITHUB_FETCH_BATCH_SIZE` | `20` | Concurrent GitHub metadata fetches |
| `GH_PAT` | empty | Optional GitHub token for higher GitHub API rate limits |
| `ANALYTICS_RESET_KEY` | empty | Secret key for analytics reset/import endpoints |
| `ANALYTICS_DIR` | `/app/data` | Analytics storage directory |
| `FIREBASE_DATABASE_URL` | empty | Firebase Realtime Database URL for analytics persistence |
| `FIREBASE_CREDENTIALS_PATH` | `.credentials/firebase-service-account.json` | Firebase service account path |
| `NOMINATIM_CONTACT_EMAIL` | empty | Optional contact email appended to Nominatim queries for self-hosted deployments |

Example `.env`:

```env
GH_PAT=your_github_pat_here
NOMINATIM_CONTACT_EMAIL=your-email@example.com
ANALYTICS_RESET_KEY=your_analytics_reset_key_here
ANALYTICS_DIR=/app/data
FIREBASE_DATABASE_URL=your_firebase_database_url_here
FIREBASE_CREDENTIALS_PATH=.credentials/firebase-service-account.json
```

## Nominatim Notes

The server now depends on public Nominatim for GTFS location-name searches. The code includes:

- A custom `User-Agent`
- Optional `email` support via `NOMINATIM_CONTACT_EMAIL`
- Serialized requests with a 1 request/second floor
- Positive and negative result caching

If you expect sustained geocoding traffic, consider self-hosting a compatible geocoder or routing through your own approved service.

## Project Structure

```text
src/
  index.ts
  http-server.ts
  config.ts
  datacatalogue.tools.ts
  dashboards.tools.ts
  dosm.tools.ts
  flood.tools.ts
  gtfs.tools.ts
  parquet.tools.ts
  transport.tools.ts
  unified-search.tools.ts
  weather.tools.ts
  firebase-analytics.ts
  utils/

deploy/
  DEPLOYMENT.md
  nginx-mcp.conf
```

## Troubleshooting

```bash
# Docker logs
docker compose logs -f

# Local health check
curl http://localhost:8080/health

# Hosted MCP tool list
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## License

MIT. See [LICENSE](./LICENSE).

## Acknowledgments

- [Malaysia Open Data Portal](https://data.gov.my/)
- [Department of Statistics Malaysia](https://open.dosm.gov.my/)
- [Malaysian Meteorological Department](https://www.met.gov.my/)
- [Nominatim](https://nominatim.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
