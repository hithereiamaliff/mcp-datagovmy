# VPS Deployment Guide for Malaysia Open Data MCP

This guide explains how to deploy the Malaysia Open Data MCP server on your VPS at `mcp.techmavie.digital/datagovmy`.

## Prerequisites

- VPS with Ubuntu/Debian
- Docker and Docker Compose installed
- Nginx installed
- Domain `mcp.techmavie.digital` pointing to your VPS IP
- SSL certificate (via Certbot/Let's Encrypt)

## Architecture

```
Client (Claude, Cursor, etc.)
    ↓ HTTPS
https://mcp.techmavie.digital/datagovmy/mcp
    ↓
Nginx (SSL termination + reverse proxy)
    ↓ HTTP
Docker Container (port 8082 → 8080)
    ↓
Malaysia Open Data APIs (data.gov.my, OpenDOSM, etc.)
```

## Deployment Steps

### 1. SSH into your VPS

```bash
ssh root@your-vps-ip
```

### 2. Create directory for the MCP server

```bash
mkdir -p /opt/mcp-servers/datagovmy
cd /opt/mcp-servers/datagovmy
```

### 3. Clone the repository

```bash
git clone https://github.com/hithereiamaliff/mcp-datagovmy.git .
```

### 4. Create environment file (optional)

```bash
cp .env.example .env
nano .env
```

Add optional API keys if needed:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
GRABMAPS_API_KEY=your_api_key_here
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-5
```

### 5. Build and start the Docker container

```bash
docker compose up -d --build
```

### 6. Verify the container is running

```bash
docker compose ps
docker compose logs -f
```

### 7. Test the health endpoint

```bash
curl http://localhost:8082/health
```

### 8. Configure Nginx

Add the location block from `deploy/nginx-mcp.conf` to your existing nginx config for `mcp.techmavie.digital`:

```bash
# Edit your existing nginx config
sudo nano /etc/nginx/sites-available/mcp.techmavie.digital

# Add the location block from deploy/nginx-mcp.conf inside the server block
# Make sure it's at the same level as other location blocks (not nested)

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 9. Test the MCP endpoint

```bash
# Test health endpoint through nginx
curl https://mcp.techmavie.digital/datagovmy/health

# Test MCP endpoint
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Client Configuration

### For Claude Desktop / Cursor / Windsurf

Add to your MCP configuration:

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

### Using Your Own API Keys

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

User-provided keys take priority over server defaults.

> **⚠️ Important: GrabMaps Requirements**
> 
> To use GrabMaps geocoding, you need **ALL FOUR** of these parameters:
> - `grabMapsApiKey`
> - `awsAccessKeyId`
> - `awsSecretAccessKey`
> - `awsRegion`
> 
> GrabMaps uses AWS Location Service under the hood, so AWS credentials are required alongside the GrabMaps API key. Without any one of these, GrabMaps will not work.

### For MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# Select "Streamable HTTP"
# Enter URL: https://mcp.techmavie.digital/datagovmy/mcp
```

## Analytics Dashboard

The MCP server includes a built-in analytics dashboard that tracks:
- **Total requests and tool calls**
- **Tool usage distribution** (doughnut chart)
- **Hourly request trends** (last 24 hours)
- **Requests by endpoint** (bar chart)
- **Top clients by user agent**
- **Recent tool calls feed**

### Analytics Endpoints

| Endpoint | Description |
|----------|-------------|
| `/analytics` | Full analytics summary (JSON) |
| `/analytics/tools` | Detailed tool usage stats (JSON) |
| `/analytics/dashboard` | Visual dashboard with charts (HTML) |

**Dashboard URL:** `https://mcp.techmavie.digital/datagovmy/analytics/dashboard`

The dashboard auto-refreshes every 30 seconds.

## Management Commands

### View logs

```bash
cd /opt/mcp-servers/datagovmy
docker compose logs -f
```

### Restart the server

```bash
docker compose restart
```

### Update to latest version

```bash
git pull origin main
docker compose up -d --build
```

### Stop the server

```bash
docker compose down
```

## GitHub Actions Auto-Deploy

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-vps.yml`) that automatically deploys to your VPS when you push to the `main` branch.

### Required GitHub Secrets

Set these in your repository settings (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USERNAME` | SSH username (e.g., root) |
| `VPS_SSH_KEY` | Your private SSH key |
| `VPS_PORT` | SSH port (usually 22) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | HTTP server port (internal) |
| `HOST` | 0.0.0.0 | Bind address |
| `GOOGLE_MAPS_API_KEY` | (optional) | For enhanced geocoding |
| `GRABMAPS_API_KEY` | (optional) | For Southeast Asia geocoding |
| `AWS_ACCESS_KEY_ID` | (optional) | For AWS Location Service |
| `AWS_SECRET_ACCESS_KEY` | (optional) | For AWS Location Service |
| `AWS_REGION` | ap-southeast-5 | AWS region for Location Service |

## Troubleshooting

### Container not starting

```bash
docker compose logs mcp-datagovmy
```

### Nginx 502 Bad Gateway

- Check if container is running: `docker compose ps`
- Check container logs: `docker compose logs`
- Verify port binding: `docker port mcp-datagovmy`

### Test MCP connection

```bash
# List tools
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call hello tool
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"my_hello","arguments":{}}}'
```

## Security Notes

- The MCP server runs behind nginx with SSL
- CORS is configured to allow all origins (required for MCP clients)
- No authentication is required (public open data)
- Rate limiting can be added at nginx level if needed

## Available Tools

This MCP server provides tools for:

- **Data Catalogue** - Search and access datasets from data.gov.my
- **OpenDOSM** - Department of Statistics Malaysia data
- **Weather** - Forecasts and warnings from MET Malaysia
- **Transport** - GTFS data for public transit
- **Flood** - Flood warning information
- **Parquet** - Parse parquet data files
- **Unified Search** - Search across all data sources
