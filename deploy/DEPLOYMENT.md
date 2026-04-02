# VPS Deployment Guide for Malaysia Open Data MCP

This guide covers a simple Docker + Nginx deployment for:

`https://mcp.techmavie.digital/datagovmy/mcp`

## Architecture

```text
Client
  -> HTTPS
Nginx reverse proxy
  -> HTTP
Docker container
  -> Malaysia Open Data APIs / GitHub metadata / Nominatim
```

## Prerequisites

- Ubuntu or Debian VPS
- Docker and Docker Compose
- Nginx
- Domain pointed at the VPS
- TLS certificate, for example via Let's Encrypt

## Deploy

### 1. Clone the repository

```bash
mkdir -p /opt/mcp-servers/datagovmy
cd /opt/mcp-servers/datagovmy
git clone https://github.com/hithereiamaliff/mcp-datagovmy.git .
```

### 2. Create `.env`

```bash
cp .env.example .env
nano .env
```

Geocoding credentials are **not required** anymore. GTFS location search uses Nominatim only.

Recommended minimal `.env`:

```env
GH_PAT=your_github_pat_here
NOMINATIM_CONTACT_EMAIL=your-email@example.com
ANALYTICS_RESET_KEY=your_analytics_reset_key_here
ANALYTICS_DIR=/app/data
FIREBASE_DATABASE_URL=your_firebase_database_url_here
FIREBASE_CREDENTIALS_PATH=.credentials/firebase-service-account.json
```

If your existing VPS `.env` still contains `GOOGLE_MAPS_API_KEY`, `GRABMAPS_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or `AWS_REGION`, they are now unused and can be removed.

### 3. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

### 4. Verify locally

```bash
curl http://localhost:8083/health
curl -X POST http://localhost:8083/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 5. Configure Nginx

Add the location block from `deploy/nginx-mcp.conf` to your existing site config, then reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Client Configuration

Use the hosted endpoint directly:

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

No API keys or query-string credentials are needed.

## Analytics Endpoints

- `/analytics`
- `/analytics/tools`
- `/analytics/dashboard`

Dashboard URL:

`https://mcp.techmavie.digital/datagovmy/analytics/dashboard`

## Management Commands

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update
git pull origin main
docker compose up -d --build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Internal HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `GH_PAT` | empty | Optional GitHub token for higher GitHub API limits |
| `NOMINATIM_CONTACT_EMAIL` | empty | Optional contact email included in Nominatim requests |
| `ANALYTICS_RESET_KEY` | empty | Secret for analytics reset/import endpoints |
| `ANALYTICS_DIR` | `/app/data` | Analytics persistence directory |
| `FIREBASE_DATABASE_URL` | empty | Firebase Realtime Database URL |
| `FIREBASE_CREDENTIALS_PATH` | `.credentials/firebase-service-account.json` | Firebase service account path |

## Troubleshooting

### Container not starting

```bash
docker compose logs mcp-datagovmy
```

### Nginx 502

- Check `docker compose ps`
- Check `docker compose logs`
- Check `docker port mcp-datagovmy`

### MCP connection test

```bash
curl -X POST https://mcp.techmavie.digital/datagovmy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
