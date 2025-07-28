# Malaysia Open Data MCP Server Tools

This document provides an overview of the available tools in the Malaysia Open Data MCP Server and best practices for using them.

## Available Tools

### Unified Search Tools

#### `search_all`

This is the **recommended primary search tool** that searches across both datasets and dashboards simultaneously. It intelligently determines whether to prioritize datasets or dashboards based on the query and automatically falls back to the other type if limited results are found.

```json
{
  "query": "your search query",
  "limit": 10, // optional, default is 10
  "prioritize": "dataset" // optional, can be "dataset" or "dashboard"
}
```

**Example usage:**
```
search_all
{
  "query": "e-payment statistics"
}
```

**When to use:** This should be your default search tool for most queries, as it provides the most comprehensive results.

### Data Catalogue Tools

#### `list_datasets_catalogue`

Lists all datasets from the comprehensive catalogue with rich metadata.

#### `search_datasets_catalogue`

Searches datasets by keywords in title or description. Only use this if you specifically need to search only in datasets.

#### `filter_datasets_catalogue`

Filters datasets by various criteria such as frequency, geography, etc.

#### `get_dataset_filters`

Gets available filter options for datasets.

#### `get_dataset_details`

Gets comprehensive metadata for a dataset by ID.

### Dashboard Tools

#### `list_dashboards`

Lists all available dashboards with pagination.

#### `search_dashboards`

Searches dashboards by name or route. Only use this if you specifically need to search only in dashboards.

#### `get_dashboard_by_name`

Gets detailed information about a specific dashboard by name.

#### `get_dashboard_charts`

Gets chart information for a specific dashboard.

## Best Practices

1. **Always start with `search_all`** for any general query about data or visualizations. This tool will search both datasets and dashboards and provide the most relevant results.

2. **Use specific tools only when needed** - for example, if you already know you need a specific dataset ID or dashboard name.

3. **Be aware of data format limitations**:
   - Dashboard data is visualized on the web interface. Raw data files (e.g., parquet) cannot be directly accessed through this API.
   - Dataset metadata is available through this API. For downloading the actual data files, users should visit the dataset page on the data portal.

4. **Use correct URLs** when referring to resources:
   - For general data portal resources: `https://data.gov.my/...`
   - For OpenDOSM resources: `https://open.dosm.gov.my/...`

5. **Handle empty results properly** - if a search returns no results, try broadening the search terms or using the `search_all` tool which automatically searches both datasets and dashboards.

### Geocoding Tools

#### `geocode_location`

Geocode a location name to coordinates using available geocoding services. This tool supports multiple geocoding providers with intelligent selection and fallback.

```json
{
  "query": "location name or address", // required: the location to geocode
  "country": "my", // optional: country code to limit results (default: "my" for Malaysia)
  "provider": "auto" // optional: preferred geocoding provider ("google", "grab", "nominatim", or "auto")
}
```

**Geocoding Providers:**

1. **Google Maps** - Requires a valid Google Maps API key set in `GOOGLE_MAPS_API_KEY` environment variable or MCP server config.

2. **GrabMaps via AWS Location Service** - For Southeast Asian locations. Requires proper setup:
   - GrabMaps API key set in environment variables or MCP server config:
     - `GRABMAPS_API_KEY`: Your GrabMaps API key
   - Valid AWS credentials with Location Service permissions:
     - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
     - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key
     - `AWS_REGION`: AWS region where your Place Index is created (default: `ap-southeast-5` for Malaysia)
   - A Place Index created in AWS Location Service with GrabMaps as the data provider (named `explore.place.Grab`)

3. **Nominatim (OpenStreetMap)** - Free, open-source geocoding service. No API key required, but has usage limits.

**Provider Selection Logic:**

When `provider` is set to `auto` (default), the tool uses the following logic:
- For Southeast Asian countries (MY, SG, TH, VN, PH, ID, MM, KH), tries GrabMaps first if credentials are available
- Tries Google Maps if API key is available
- Falls back to GrabMaps for non-Southeast Asian locations if not already tried
- Uses Nominatim as the final fallback option

**Supported providers:**
- `auto` - Automatically select the best provider based on location and available API keys
- `google` - Use Google Maps API (requires API key)
- `grab` - Use GrabMaps API (requires API key, optimized for Southeast Asia)
- `nominatim` - Use OpenStreetMap Nominatim API (free, no API key required)

**Example usage:**
```
geocode_location
{
  "query": "KLCC",
  "provider": "grab"
}
```

**When to use:** Use this tool when you need to convert a location name or address to geographic coordinates. For Malaysian locations, the GrabMaps provider is recommended when available as it's optimized for Southeast Asian locations.

### GTFS Transit Data Tools

The GTFS tools support intelligent provider and category normalization, allowing users to use common names instead of exact API parameters. For example, you can use "rapid penang" instead of specifying "prasarana" as the provider and "rapid-bus-penang" as the category.

#### Supported Providers and Categories

**Direct Providers:**
- `mybas-johor` (also accepts: "mybas", "mybas johor", "mybas johor bahru")
- `ktmb` (also accepts: "ktm", "keretapi tanah melayu", "keretapi tanah melayu berhad")
- `prasarana` (requires a category)

**Prasarana Categories:**
- `rapid-rail-kl` (also accepts: "rapid rail", "rapid rail kl")
- `rapid-bus-kl` (also accepts: "rapid bus kl")
- `rapid-bus-penang` (also accepts: "rapid penang", "rapid bus penang")
- `rapid-bus-kuantan` (also accepts: "rapid kuantan", "rapid bus kuantan")
- `rapid-bus-mrtfeeder` (also accepts: "mrt feeder", "rapid bus mrt feeder")

#### `parse_gtfs_static`

Parses GTFS Static data (ZIP files with CSV data) for a specific transport provider and returns structured data.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "force_refresh": false // optional: force refresh the cache
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang" // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
}
```

**Example usage:**
```
parse_gtfs_static
{
  "provider": "ktmb"
}
```

**When to use:** This is a low-level tool. For most user queries about transit routes or stops, prefer using `get_transit_routes` or `get_transit_stops` instead. Only use this when you need access to the raw GTFS static data files.

#### `parse_gtfs_realtime`

Parses GTFS Realtime data (Protocol Buffers) for a specific transport provider and returns structured data.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "force_refresh": false // optional: force refresh the cache
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang" // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
}
```

**Example usage:**
```
parse_gtfs_realtime
{
  "provider": "prasarana",
  "category": "rapid-rail-kl"
}
```

**When to use:** When you need real-time information about vehicle positions for a specific transit provider. You can use common names directly (e.g., "rapid penang", "ktmb", "mybas johor") without needing to call `list_transport_agencies` first.

#### `get_transit_routes`

Retrieves transit routes for a specific provider from parsed GTFS Static data. This is the preferred tool for answering questions about transit routes.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "route_id": "1" // optional: filter by route_id
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang" // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
}
```

**Example usage:**
```
get_transit_routes
{
  "provider": "mybas-johor"
}
```

**When to use:** When you need information about transit routes without parsing the entire GTFS dataset.

#### `get_transit_stops`

Retrieves transit stops for a specific provider from parsed GTFS Static data.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "stop_id": "1" // optional: filter by stop_id
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang" // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
}
```

**Example usage:**
```
get_transit_stops
{
  "provider": "prasarana",
  "category": "rapid-rail-kl",
  "route_id": "LRT-KJ"
}
```

**When to use:** When you need information about transit stops, optionally filtered by route.

#### `find_nearest_transit_stops`

Finds the nearest transit stops to a given location. This is the preferred tool for answering questions about finding nearby bus stops.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "latitude": 3.1390, // required: latitude of the user's location
  "longitude": 101.6869, // required: longitude of the user's location
  "limit": 5, // optional: maximum number of stops to return (default: 5)
  "max_distance": 5 // optional: maximum distance in kilometers (default: 5)
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang", // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
  "latitude": 5.4141, 
  "longitude": 100.3292
}
```

**Example usage:**
```
find_nearest_transit_stops
{
  "provider": "rapid penang",
  "latitude": 5.4141,
  "longitude": 100.3292,
  "limit": 3
}
```

**When to use:** When a user asks about finding the nearest bus stop or station to their location. This tool calculates distances and returns stops sorted by proximity.

#### `get_transit_arrivals`

Get real-time transit arrivals at a specific stop. This is the preferred tool for answering questions about when the next bus or train will arrive.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "stop_id": "1234", // required: ID of the stop to get arrivals for
  "route_id": "LRT-KJ", // optional: filter arrivals by route
  "limit": 10 // optional: maximum number of arrivals to return (default: 10)
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang", // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
  "stop_id": "1001"
}
```

**Example usage:**
```
get_transit_arrivals
{
  "provider": "rapid penang",
  "stop_id": "1001",
  "limit": 5
}
```

**When to use:** When a user asks about real-time bus or train arrivals at a specific stop, such as "When will the next bus arrive at my stop?" or "Show me arrival times for Rapid Penang buses at stop X".

#### `search_transit_stops_by_location`

Search for transit stops near a named location. This tool geocodes the location name to coordinates using the multi-provider geocoding system (Google Maps, GrabMaps, or Nominatim), then finds nearby stops with optional real-time arrival information. For Malaysian locations, GrabMaps is preferred when available as it's optimized for Southeast Asian locations.

```json
{
  "provider": "ktmb", // required: "mybas-johor", "ktmb", or "prasarana" (or common names)
  "category": "rapid-rail-kl", // required only for prasarana provider
  "location": "KLCC", // required: location name to search for
  "country": "my", // optional: country code to limit geocoding results (default: "my" for Malaysia)
  "limit": 5, // optional: maximum number of stops to return (default: 5)
  "max_distance": 5, // optional: maximum distance in kilometers (default: 5)
  "include_arrivals": true, // optional: whether to include upcoming arrivals for each stop (default: true)
  "arrivals_limit": 3 // optional: maximum number of arrivals to include per stop (default: 3)
}
```

**Example with common name:**
```json
{
  "provider": "rapid penang", // automatically maps to provider: "prasarana", category: "rapid-bus-penang"
  "location": "Penang Airport",
  "max_distance": 2
}
```

**Example usage:**
```
search_transit_stops_by_location
{
  "provider": "rapid penang",
  "location": "Penang Airport",
  "limit": 3,
  "include_arrivals": true
}
```

**When to use:** When a user asks about finding transit stops near a specific location by name, such as "Show me bus stops near KLCC" or "What buses stop at KL Sentral?". This tool combines geocoding with transit data to provide a complete solution.
