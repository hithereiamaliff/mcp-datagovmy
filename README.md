# Malaysia Open Data MCP - Simplified Smithery Deployment

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
