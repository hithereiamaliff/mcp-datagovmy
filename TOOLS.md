# Malaysia Open Data MCP Server Tools

This document summarizes the tools exposed by the Malaysia Open Data MCP server and gives a few practical usage tips.

## Best Practices

1. Start with `search_all` for broad user questions about Malaysian data.
2. Use the more specific dataset or dashboard tools only when you already know the type of resource you want.
3. Prefer GTFS high-level tools such as `get_transit_routes`, `get_transit_stops`, `get_transit_arrivals`, and `search_transit_stops_by_location` over raw GTFS parsing unless you need the underlying feed data.
4. Remember that GTFS location-name search uses Nominatim only. There are no Google Maps, GrabMaps, or AWS credential paths anymore.
5. For heavier self-hosted transit geocoding workloads, set `NOMINATIM_CONTACT_EMAIL` and keep public Nominatim usage conservative.

## Search and Catalogue Tools

### `search_all`

Recommended first tool for most open-ended data questions. It searches datasets and dashboards together.

Example:

```json
{
  "query": "e-payment statistics",
  "limit": 10
}
```

### Dataset catalogue

- `list_datasets_catalogue`
- `search_datasets_catalogue`
- `filter_datasets_catalogue`
- `get_dataset_filters`
- `get_dataset_details`

Use these when you know you want data catalogue resources specifically.

### Dashboards

- `list_dashboards`
- `search_dashboards`
- `get_dashboard_details`
- `get_dashboard_charts`

Use these when the user is clearly asking for dashboard or visualization resources.

### DOSM

- `list_dosm_datasets`
- `get_dosm_dataset`

## Parquet Tools

- `parse_parquet_file`
- `get_parquet_info`
- `find_dashboard_for_parquet`

These help with parquet-backed datasets and with mapping raw data files back to the dashboard that visualizes them.

### `parse_parquet_file`

Parses and displays data from a Parquet file URL. Supports three output modes via the `output_mode` parameter:

**Parameters:**

- `url` (required): URL of the Parquet file
- `maxRows` (optional, default 500, max 2000): Maximum rows to return in `raw` mode, sample in `summary` mode, or display from the latest period in `latest` mode
- `output_mode` (optional, default `"raw"`): One of `"raw"`, `"summary"`, or `"latest"`
- `group_by` (optional, summary mode only): Column name to group by

**Output modes:**

- `"raw"` (default): Returns full row data, identical to the original behavior.
- `"summary"`: Returns per-column statistical summaries (min/max/mean/median for numeric, top values for categorical, date ranges for date columns) plus sample rows from the head and tail of the file. If the dataset has more rows than `maxRows`, the response is explicitly labeled as sampled.
- `"latest"`: Scans the dataset for a usable date column, determines granularity (daily/monthly/yearly), and returns only rows from the most recent period. If no usable date column is found, it falls back to tail rows with a warning.

Example (summary mode):

```json
{
  "url": "https://storage.data.gov.my/example.parquet",
  "output_mode": "summary"
}
```

Example (latest mode):

```json
{
  "url": "https://storage.data.gov.my/example.parquet",
  "output_mode": "latest"
}
```

Example (summary with grouping):

```json
{
  "url": "https://storage.data.gov.my/example.parquet",
  "output_mode": "summary",
  "group_by": "state"
}
```

## Weather and Flood Tools

- `get_weather_forecast`
- `get_weather_warnings`
- `get_earthquake_warnings`
- `get_flood_warnings`

## Transport and GTFS Tools

### Transport index tools

- `list_transport_agencies`
- `get_transport_data`
- `get_gtfs_static`
- `get_gtfs_realtime_vehicle_position`

### GTFS parsing and lookup tools

- `parse_gtfs_static`
- `parse_gtfs_realtime`
- `get_transit_routes`
- `get_transit_stops`
- `get_transit_arrivals`
- `search_transit_stops_by_location`
- `find_nearest_transit_stops`

### Supported GTFS providers

Direct providers:

- `mybas-johor`
- `ktmb`
- `prasarana`

Common names are also normalized. Examples:

- `rapid penang` -> `prasarana` + `rapid-bus-penang`
- `rapid kuantan` -> `prasarana` + `rapid-bus-kuantan`
- `rapid rail` -> `prasarana` + `rapid-rail-kl`
- `mybas johor` -> `mybas-johor`
- `ktm` -> `ktmb`

### `search_transit_stops_by_location`

This is the main location-name transit search tool. It geocodes the supplied location with Nominatim, then searches nearby stops and can optionally include upcoming arrivals.

Example:

```json
{
  "provider": "rapid penang",
  "location": "Penang Airport",
  "max_distance": 2,
  "include_arrivals": true
}
```

Arguments:

- `provider`: required GTFS provider or common name
- `category`: optional, required only for direct `prasarana` usage
- `location`: required location name
- `country`: optional country code, defaults to `my`
- `limit`: optional result limit, defaults to `5`
- `max_distance`: optional distance in km, defaults to `5`
- `include_arrivals`: optional, defaults to `true`
- `arrivals_limit`: optional arrivals per stop, defaults to `3`

### `find_nearest_transit_stops`

Use this when the user already has coordinates.

Example:

```json
{
  "provider": "rapid penang",
  "latitude": 5.4141,
  "longitude": 100.3292,
  "limit": 3
}
```

### Geocoding behavior

The GTFS tools use Nominatim (OpenStreetMap) only:

- No geocoding credentials are required
- Requests are serialized to avoid bursting the public API
- Results are cached, including misses
- `NOMINATIM_CONTACT_EMAIL` is optional for self-hosted deployments

## Miscellaneous

### `hello`

Simple health-check style MCP tool for connectivity testing.
