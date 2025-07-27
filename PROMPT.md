# Malaysia Open Data MCP Server - AI Prompt Guide

When using the Malaysia Open Data MCP server, follow these guidelines to ensure optimal results:

## Primary Search Tool

**ALWAYS use the `search_all` tool first** when searching for any data, statistics, or visualizations related to Malaysia's open data. This tool provides unified search across both datasets and dashboards, with intelligent fallback to ensure comprehensive results.

Example:
```
search_all
{
  "query": "e-payment statistics"
}
```

Only use specific dataset or dashboard search tools if you need to explicitly limit your search to one type of content.

## Data Access Pattern

1. Start with `search_all` to find relevant resources
2. For detailed dataset information, use `get_dataset_details` with the dataset ID
3. For dashboard information, use `get_dashboard_by_name` with the dashboard name
4. For dashboard charts, use `get_dashboard_charts` with the dashboard name

## URL References

When referring to resources in responses:
- Use `https://data.gov.my/...` for general data portal resources
- Use `https://open.dosm.gov.my/...` for OpenDOSM resources

## Data Format Limitations

- Dashboard data is visualized on the web interface. Raw data files (e.g., parquet) cannot be directly accessed through this API.
- Dataset metadata is available through this API. For downloading the actual data files, users should visit the dataset page on the data portal.

## Hybrid Architecture

This MCP server uses a hybrid approach:
- Pre-generated static indexes for efficient listing and searching
- Dynamic API calls only when specific dataset or dashboard details are requested

This ensures fast responses while maintaining up-to-date information.
