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
