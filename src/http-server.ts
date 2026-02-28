/**
 * Malaysia Open Data MCP Server - Streamable HTTP Transport
 * 
 * This file provides an HTTP server for self-hosting the MCP server on a VPS.
 * It uses the Streamable HTTP transport for MCP communication.
 * 
 * Usage:
 *   npm run build
 *   node dist/http-server.js
 * 
 * Or with environment variables:
 *   PORT=8080 node dist/http-server.js
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { runWithRequestContext } from './request-context.js';
import { getRuntimeConfig, type CredentialConfig } from './runtime-config.js';

// Import tool registration functions
import { registerFloodTools } from './flood.tools.js';
import { registerWeatherTools } from './weather.tools.js';
import { registerTransportTools } from './transport.tools.js';
import { registerDataCatalogueTools } from './datacatalogue.tools.js';
import { registerDosmTools } from './dosm.tools.js';
import { registerDashboardTools } from './dashboards.tools.js';
import { registerUnifiedSearchTools } from './unified-search.tools.js';
import { registerParquetTools } from './parquet.tools.js';
import { registerGtfsTools } from './gtfs.tools.js';
import { prefixToolName } from './utils/tool-naming.js';
import { warmCache } from './utils/github-index.js';

// Import Firebase analytics
import { saveAnalyticsToFirebase, loadAnalyticsFromFirebase } from './firebase-analytics.js';

// Type definition for tool registration functions
type ToolRegistrationFn = (server: McpServer) => void;

// ============================================================================
// Analytics Tracking with File Persistence + Firebase
// ============================================================================
interface ToolCall {
  tool: string;
  timestamp: string;
  clientIp: string;
  userAgent: string;
}

interface Analytics {
  serverStartTime: string;
  totalRequests: number;
  totalToolCalls: number;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  toolCalls: Record<string, number>;
  recentToolCalls: ToolCall[];
  clientsByIp: Record<string, number>;
  clientsByUserAgent: Record<string, number>;
  hourlyRequests: Record<string, number>;
}

// Analytics file path - use /app/data for Docker volume mount
const ANALYTICS_DIR = process.env.ANALYTICS_DIR || '/app/data';
const ANALYTICS_FILE = path.join(ANALYTICS_DIR, 'analytics.json');

const MAX_RECENT_CALLS = 100;
const SAVE_INTERVAL_MS = 30000; // Save every 30 seconds

// Default analytics state
const defaultAnalytics: Analytics = {
  serverStartTime: new Date().toISOString(),
  totalRequests: 0,
  totalToolCalls: 0,
  requestsByMethod: {},
  requestsByEndpoint: {},
  toolCalls: {},
  recentToolCalls: [],
  clientsByIp: {},
  clientsByUserAgent: {},
  hourlyRequests: {},
};

// Load analytics from Firebase first, then fall back to file
async function loadAnalytics(): Promise<Analytics> {
  // Try Firebase first
  console.log('Attempting to load analytics from Firebase...');
  const firebaseData = await loadAnalyticsFromFirebase();
  if (firebaseData) {
    return firebaseData;
  }

  // Fall back to local file
  try {
    // Ensure directory exists
    if (!fs.existsSync(ANALYTICS_DIR)) {
      fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
    }
    
    if (fs.existsSync(ANALYTICS_FILE)) {
      const data = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      const loaded = JSON.parse(data) as Analytics;
      console.log(`📊 Loaded analytics from ${ANALYTICS_FILE}:`, {
        totalRequests: loaded.totalRequests,
        totalToolCalls: loaded.totalToolCalls,
      });
      return loaded;
    }
  } catch (error) {
    console.error('Failed to load analytics from file:', error);
  }
  console.log('Starting with fresh analytics');
  return { ...defaultAnalytics };
}

// Save analytics to both file and Firebase
async function saveAnalytics(): Promise<void> {
  // Save to local file (synchronous backup)
  try {
    // Ensure directory exists
    if (!fs.existsSync(ANALYTICS_DIR)) {
      fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
    }
    
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
    // Don't log every save to reduce noise
  } catch (error) {
    console.error('Failed to save analytics locally:', error);
  }

  // Save to Firebase (async, non-blocking)
  saveAnalyticsToFirebase(analytics).catch(err => {
    console.error('Firebase save error:', err);
  });
}

// Initialize analytics with defaults immediately to prevent race condition
let analytics: Analytics = { ...defaultAnalytics };

// Load persisted analytics asynchronously and merge on startup
loadAnalytics().then(data => {
  analytics = data;
  console.log('Analytics initialized:', {
    totalRequests: analytics.totalRequests.toLocaleString(),
    totalToolCalls: analytics.totalToolCalls,
  });
}).catch(error => {
  console.error('Failed to initialize analytics:', error);
});

// Periodic save
setInterval(saveAnalytics, SAVE_INTERVAL_MS);

// Save on process exit
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, saving analytics...');
  saveAnalytics();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, saving analytics...');
  saveAnalytics();
  process.exit(0);
});

function trackRequest(req: Request, endpoint: string) {
  analytics.totalRequests++;
  
  // Track by method
  const method = req.method;
  analytics.requestsByMethod[method] = (analytics.requestsByMethod[method] || 0) + 1;
  
  // Track by endpoint
  analytics.requestsByEndpoint[endpoint] = (analytics.requestsByEndpoint[endpoint] || 0) + 1;
  
  // Track by client IP
  const clientIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  analytics.clientsByIp[clientIp] = (analytics.clientsByIp[clientIp] || 0) + 1;
  
  // Track by user agent
  const userAgent = req.headers['user-agent'] || 'unknown';
  const shortAgent = userAgent.substring(0, 50);
  analytics.clientsByUserAgent[shortAgent] = (analytics.clientsByUserAgent[shortAgent] || 0) + 1;
  
  // Track hourly
  const hour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
  analytics.hourlyRequests[hour] = (analytics.hourlyRequests[hour] || 0) + 1;
}

function trackToolCall(toolName: string, req: Request) {
  analytics.totalToolCalls++;
  analytics.toolCalls[toolName] = (analytics.toolCalls[toolName] || 0) + 1;
  
  const toolCall: ToolCall = {
    tool: toolName,
    timestamp: new Date().toISOString(),
    clientIp: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    userAgent: (req.headers['user-agent'] || 'unknown').substring(0, 50),
  };
  
  analytics.recentToolCalls.unshift(toolCall);
  if (analytics.recentToolCalls.length > MAX_RECENT_CALLS) {
    analytics.recentToolCalls.pop();
  }
}

function getUptime(): string {
  const start = new Date(analytics.serverStartTime).getTime();
  const now = Date.now();
  const diff = now - start;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Extract request-scoped API keys from headers or query params.
 * User-provided keys override configured defaults for this request only.
 */
function extractApiKeys(req: Request): CredentialConfig {
  const defaults = getRuntimeConfig();
  return {
    googleMapsApiKey:
      (req.headers['x-google-maps-api-key'] as string) ||
      (req.query.googleMapsApiKey as string) ||
      defaults.googleMapsApiKey,
    grabMapsApiKey:
      (req.headers['x-grabmaps-api-key'] as string) ||
      (req.query.grabMapsApiKey as string) ||
      defaults.grabMapsApiKey,
    awsAccessKeyId:
      (req.headers['x-aws-access-key-id'] as string) ||
      (req.query.awsAccessKeyId as string) ||
      defaults.awsAccessKeyId,
    awsSecretAccessKey:
      (req.headers['x-aws-secret-access-key'] as string) ||
      (req.query.awsSecretAccessKey as string) ||
      defaults.awsSecretAccessKey,
    awsRegion:
      (req.headers['x-aws-region'] as string) ||
      (req.query.awsRegion as string) ||
      defaults.awsRegion,
  };
}

// Create MCP server
const mcpServer = new McpServer({
  name: 'Malaysia Open Data MCP Server',
  version: '1.0.0',
});

// Register all tool sets
const toolSets: ToolRegistrationFn[] = [
  registerDataCatalogueTools,
  registerDosmTools,
  registerWeatherTools,
  registerDashboardTools,
  registerUnifiedSearchTools,
  registerParquetTools,
  registerGtfsTools,
  registerTransportTools,
  registerFloodTools,
];

// Register all tools
toolSets.forEach((toolSet) => toolSet(mcpServer));

// Register hello tool for testing
mcpServer.tool(
  prefixToolName('hello'),
  'A simple test tool to verify that the MCP server is working correctly',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Hello from Malaysia Open Data MCP!',
            timestamp: new Date().toISOString(),
            transport: 'streamable-http',
          }, null, 2),
        },
      ],
    };
  }
);

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for MCP clients
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Mcp-Session-Id', 'X-Google-Maps-Api-Key', 'X-GrabMaps-Api-Key', 'X-AWS-Access-Key-Id', 'X-AWS-Secret-Access-Key', 'X-AWS-Region'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  trackRequest(req, '/health');
  res.json({
    status: 'healthy',
    server: 'Malaysia Open Data MCP',
    version: '1.0.0',
    transport: 'streamable-http',
    timestamp: new Date().toISOString(),
  });
});

// Analytics endpoint - summary
app.get('/analytics', (req: Request, res: Response) => {
  trackRequest(req, '/analytics');
  
  // Sort tool calls by count
  const sortedTools = Object.entries(analytics.toolCalls)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  
  // Sort clients by count
  const sortedClients = Object.entries(analytics.clientsByIp)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  
  // Get last 24 hours of hourly data
  const last24Hours = Object.entries(analytics.hourlyRequests)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 24)
    .reverse()
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  
  res.json({
    server: 'Malaysia Open Data MCP',
    uptime: getUptime(),
    serverStartTime: analytics.serverStartTime,
    summary: {
      totalRequests: analytics.totalRequests,
      totalToolCalls: analytics.totalToolCalls,
      uniqueClients: Object.keys(analytics.clientsByIp).length,
    },
    breakdown: {
      byMethod: analytics.requestsByMethod,
      byEndpoint: analytics.requestsByEndpoint,
      byTool: sortedTools,
    },
    clients: {
      byIp: sortedClients,
      byUserAgent: analytics.clientsByUserAgent,
    },
    hourlyRequests: last24Hours,
    recentToolCalls: analytics.recentToolCalls.slice(0, 20),
  });
});

// Analytics endpoint - detailed tool stats
app.get('/analytics/tools', (req: Request, res: Response) => {
  trackRequest(req, '/analytics/tools');
  
  const sortedTools = Object.entries(analytics.toolCalls)
    .sort(([, a], [, b]) => b - a)
    .map(([tool, count]) => ({
      tool,
      count,
      percentage: analytics.totalToolCalls > 0 
        ? ((count / analytics.totalToolCalls) * 100).toFixed(1) + '%'
        : '0%',
    }));
  
  res.json({
    totalToolCalls: analytics.totalToolCalls,
    tools: sortedTools,
    recentCalls: analytics.recentToolCalls,
  });
});

// Analytics endpoint - reset (protected by query param)
app.post('/analytics/reset', (req: Request, res: Response) => {
  const resetKey = req.query.key;
  if (!process.env.ANALYTICS_RESET_KEY || resetKey !== process.env.ANALYTICS_RESET_KEY) {
    res.status(403).json({ error: 'Invalid reset key' });
    return;
  }
  
  analytics.totalRequests = 0;
  analytics.totalToolCalls = 0;
  analytics.requestsByMethod = {};
  analytics.requestsByEndpoint = {};
  analytics.toolCalls = {};
  analytics.recentToolCalls = [];
  analytics.clientsByIp = {};
  analytics.clientsByUserAgent = {};
  analytics.hourlyRequests = {};
  analytics.serverStartTime = new Date().toISOString();
  
  saveAnalytics();
  res.json({ message: 'Analytics reset successfully', timestamp: analytics.serverStartTime });
});

// Analytics endpoint - import/restore (protected by query param)
app.post('/analytics/import', (req: Request, res: Response) => {
  const importKey = req.query.key;
  if (!process.env.ANALYTICS_RESET_KEY || importKey !== process.env.ANALYTICS_RESET_KEY) {
    res.status(403).json({ error: 'Invalid import key' });
    return;
  }
  
  try {
    const importData = req.body;
    
    // Merge imported data with current analytics (add to existing counts)
    if (importData.totalRequests) {
      analytics.totalRequests += importData.totalRequests;
    }
    if (importData.totalToolCalls) {
      analytics.totalToolCalls += importData.totalToolCalls;
    }
    
    // Merge tool calls
    if (importData.toolCalls || importData.breakdown?.byTool) {
      const toolData = importData.toolCalls || importData.breakdown?.byTool || {};
      for (const [tool, count] of Object.entries(toolData)) {
        analytics.toolCalls[tool] = (analytics.toolCalls[tool] || 0) + (count as number);
      }
    }
    
    // Merge request methods
    if (importData.requestsByMethod || importData.breakdown?.byMethod) {
      const methodData = importData.requestsByMethod || importData.breakdown?.byMethod || {};
      for (const [method, count] of Object.entries(methodData)) {
        analytics.requestsByMethod[method] = (analytics.requestsByMethod[method] || 0) + (count as number);
      }
    }
    
    // Merge endpoints
    if (importData.requestsByEndpoint || importData.breakdown?.byEndpoint) {
      const endpointData = importData.requestsByEndpoint || importData.breakdown?.byEndpoint || {};
      for (const [endpoint, count] of Object.entries(endpointData)) {
        analytics.requestsByEndpoint[endpoint] = (analytics.requestsByEndpoint[endpoint] || 0) + (count as number);
      }
    }
    
    // Merge hourly requests
    if (importData.hourlyRequests) {
      for (const [hour, count] of Object.entries(importData.hourlyRequests)) {
        analytics.hourlyRequests[hour] = (analytics.hourlyRequests[hour] || 0) + (count as number);
      }
    }
    
    // Merge clients by IP
    if (importData.clientsByIp || importData.clients?.byIp) {
      const ipData = importData.clientsByIp || importData.clients?.byIp || {};
      for (const [ip, count] of Object.entries(ipData)) {
        analytics.clientsByIp[ip] = (analytics.clientsByIp[ip] || 0) + (count as number);
      }
    }
    
    // Merge clients by user agent
    if (importData.clientsByUserAgent || importData.clients?.byUserAgent) {
      const agentData = importData.clientsByUserAgent || importData.clients?.byUserAgent || {};
      for (const [agent, count] of Object.entries(agentData)) {
        analytics.clientsByUserAgent[agent] = (analytics.clientsByUserAgent[agent] || 0) + (count as number);
      }
    }
    
    // Add recent tool calls (prepend imported ones)
    if (importData.recentToolCalls) {
      analytics.recentToolCalls = [...importData.recentToolCalls, ...analytics.recentToolCalls].slice(0, MAX_RECENT_CALLS);
    }
    
    saveAnalytics();
    res.json({ 
      message: 'Analytics imported successfully', 
      current: {
        totalRequests: analytics.totalRequests,
        totalToolCalls: analytics.totalToolCalls,
      }
    });
  } catch (error) {
    console.error('Failed to import analytics:', error);
    res.status(400).json({ error: 'Failed to import analytics data' });
  }
});

// Analytics dashboard - visual HTML page
app.get('/analytics/dashboard', (req: Request, res: Response) => {
  trackRequest(req, '/analytics/dashboard');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Malaysia Open Data MCP - Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #e4e4e7;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    header h1 {
      font-size: 2rem;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    header p { color: #a1a1aa; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-4px); }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(90deg, #34d399, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-label { color: #a1a1aa; margin-top: 8px; font-size: 0.9rem; }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .chart-card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .chart-card h3 {
      margin-bottom: 16px;
      color: #e4e4e7;
      font-size: 1.1rem;
    }
    .chart-container { position: relative; height: 300px; }
    .recent-calls {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .recent-calls h3 { margin-bottom: 16px; }
    .call-list { max-height: 400px; overflow-y: auto; }
    .call-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .call-tool {
      font-weight: 600;
      color: #60a5fa;
      font-family: monospace;
    }
    .call-time { color: #71717a; font-size: 0.85rem; }
    .call-client { color: #a1a1aa; font-size: 0.8rem; }
    .refresh-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
      transition: transform 0.2s;
    }
    .refresh-btn:hover { transform: scale(1.05); }
    .uptime-badge {
      display: inline-block;
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      margin-top: 8px;
    }
    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
      .stat-value { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🇲🇾 Malaysia Open Data MCP Analytics</h1>
      <p>Real-time usage statistics for the MCP server</p>
      <div style="margin-top: 12px;">
        <span class="uptime-badge" id="uptime">Loading...</span>
        <span class="uptime-badge" style="background: rgba(251, 146, 60, 0.2); color: #fb923c; margin-left: 8px;">🔥 Firebase Connected</span>
      </div>
    </header>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="totalRequests">-</div>
        <div class="stat-label">Total Requests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="totalToolCalls">-</div>
        <div class="stat-label">Tool Calls</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="uniqueClients">-</div>
        <div class="stat-label">Unique Clients</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="topTool">-</div>
        <div class="stat-label">Top Tool</div>
      </div>
    </div>
    
    <div class="charts-grid">
      <div class="chart-card">
        <h3>📊 Tool Usage Distribution</h3>
        <div class="chart-container">
          <canvas id="toolChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>📈 Hourly Requests (Last 24h)</h3>
        <div class="chart-container">
          <canvas id="hourlyChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>🔗 Requests by Endpoint</h3>
        <div class="chart-container">
          <canvas id="endpointChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>👥 Top Clients</h3>
        <div class="chart-container">
          <canvas id="clientChart"></canvas>
        </div>
      </div>
    </div>
    
    <div class="recent-calls">
      <h3>🕐 Recent Tool Calls</h3>
      <div class="call-list" id="recentCalls">Loading...</div>
    </div>
  </div>
  
  <button class="refresh-btn" onclick="loadData()">🔄 Refresh</button>
  
  <script>
    let toolChart, hourlyChart, endpointChart, clientChart;
    
    const chartColors = [
      '#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171',
      '#38bdf8', '#c084fc', '#4ade80', '#facc15', '#fb923c'
    ];
    
    async function loadData() {
      try {
        // Get base path from current URL (handles nginx reverse proxy paths like /datagovmy/)
        const basePath = window.location.pathname.replace(/\\/analytics\\/dashboard\\/?$/, '');
        const res = await fetch(basePath + '/analytics');
        const data = await res.json();
        
        document.getElementById('uptime').textContent = 'Uptime: ' + data.uptime;
        document.getElementById('totalRequests').textContent = data.summary.totalRequests.toLocaleString();
        document.getElementById('totalToolCalls').textContent = data.summary.totalToolCalls.toLocaleString();
        document.getElementById('uniqueClients').textContent = data.summary.uniqueClients.toLocaleString();
        
        const tools = Object.entries(data.breakdown.byTool);
        document.getElementById('topTool').textContent = tools.length > 0 ? tools[0][0].replace('datagovmy_', '') : '-';
        
        updateToolChart(data.breakdown.byTool);
        updateHourlyChart(data.hourlyRequests);
        updateEndpointChart(data.breakdown.byEndpoint);
        updateClientChart(data.clients.byUserAgent);
        updateRecentCalls(data.recentToolCalls);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    }
    
    function updateToolChart(toolData) {
      const labels = Object.keys(toolData).map(t => t.replace('datagovmy_', ''));
      const values = Object.values(toolData);
      
      if (toolChart) toolChart.destroy();
      toolChart = new Chart(document.getElementById('toolChart'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: chartColors,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#a1a1aa' } }
          }
        }
      });
    }
    
    function updateHourlyChart(hourlyData) {
      const labels = Object.keys(hourlyData).map(h => h.substring(11) + ':00');
      const values = Object.values(hourlyData);
      
      if (hourlyChart) hourlyChart.destroy();
      hourlyChart = new Chart(document.getElementById('hourlyChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Requests',
            data: values,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
    
    function updateEndpointChart(endpointData) {
      const labels = Object.keys(endpointData);
      const values = Object.values(endpointData);
      
      if (endpointChart) endpointChart.destroy();
      endpointChart = new Chart(document.getElementById('endpointChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: chartColors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#71717a' }, grid: { display: false } },
            y: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
    
    function updateClientChart(clientData) {
      const entries = Object.entries(clientData).slice(0, 5);
      const labels = entries.map(([k]) => k.substring(0, 30));
      const values = entries.map(([, v]) => v);
      
      if (clientChart) clientChart.destroy();
      clientChart = new Chart(document.getElementById('clientChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: chartColors,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#71717a' }, grid: { display: false } }
          }
        }
      });
    }
    
    function updateRecentCalls(calls) {
      const container = document.getElementById('recentCalls');
      if (calls.length === 0) {
        container.innerHTML = '<p style="color: #71717a;">No tool calls yet</p>';
        return;
      }
      
      container.innerHTML = calls.map(call => \`
        <div class="call-item">
          <div>
            <span class="call-tool">\${call.tool.replace('datagovmy_', '')}</span>
            <div class="call-client">\${call.userAgent}</div>
          </div>
          <span class="call-time">\${new Date(call.timestamp).toLocaleTimeString()}</span>
        </div>
      \`).join('');
    }
    
    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>
`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Create Streamable HTTP transport (stateless)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless transport
});

// MCP endpoint - handles POST (requests), GET (SSE), DELETE (session close)
app.all('/mcp', async (req: Request, res: Response) => {
  try {
    // Track request
    trackRequest(req, '/mcp');
    
    // Build request-scoped credentials (user keys override defaults)
    const requestCredentials = extractApiKeys(req);
    
    // Track tool calls from request body
    if (req.body && req.body.method === 'tools/call' && req.body.params?.name) {
      trackToolCall(req.body.params.name, req);
    }
    
    // Log request info
    console.log('Received MCP request:', {
      method: req.method,
      path: req.path,
      mcpMethod: req.body?.method,
      hasGoogleMapsKey: !!requestCredentials.googleMapsApiKey,
      hasGrabMapsKey: !!requestCredentials.grabMapsApiKey,
      hasAwsCredentials: !!(requestCredentials.awsAccessKeyId && requestCredentials.awsSecretAccessKey),
    });

    await runWithRequestContext(
      { credentials: requestCredentials },
      async () => transport.handleRequest(req, res, req.body)
    );
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: 'Internal server error' 
        },
        id: null,
      });
    }
  }
});

// Root endpoint with server info
app.get('/', (req: Request, res: Response) => {
  trackRequest(req, '/');
  res.json({
    name: 'Malaysia Open Data MCP Server',
    version: '1.0.0',
    description: 'MCP server for Malaysia Open Data APIs (data.gov.my, OpenDOSM, weather, transport)',
    transport: 'streamable-http',
    endpoints: {
      mcp: '/mcp',
      health: '/health',
      analytics: '/analytics',
      analyticsTools: '/analytics/tools',
      analyticsDashboard: '/analytics/dashboard',
    },
    apiKeySupport: {
      description: 'You can provide your own API keys via URL query params or headers',
      queryParams: {
        googleMapsApiKey: 'Google Maps API key for geocoding',
        grabMapsApiKey: 'GrabMaps API key for Southeast Asia geocoding',
        awsAccessKeyId: 'AWS Access Key ID for AWS Location Service',
        awsSecretAccessKey: 'AWS Secret Access Key',
        awsRegion: 'AWS Region (default: ap-southeast-5)',
      },
      headers: {
        'X-Google-Maps-Api-Key': 'Google Maps API key',
        'X-GrabMaps-Api-Key': 'GrabMaps API key',
        'X-AWS-Access-Key-Id': 'AWS Access Key ID',
        'X-AWS-Secret-Access-Key': 'AWS Secret Access Key',
        'X-AWS-Region': 'AWS Region',
      },
      example: '/mcp?googleMapsApiKey=YOUR_KEY',
      important: 'GrabMaps requires ALL FOUR params: grabMapsApiKey + awsAccessKeyId + awsSecretAccessKey + awsRegion. Without any one of these, GrabMaps will not work.',
    },
    documentation: 'https://github.com/hithereiamaliff/mcp-datagovmy',
  });
});

// Connect server to transport and start listening
mcpServer.server.connect(transport)
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log('='.repeat(60));
      console.log('🇲🇾 Malaysia Open Data MCP Server (Streamable HTTP)');
      console.log('='.repeat(60));
      console.log(`📍 Server running on http://${HOST}:${PORT}`);
      console.log(`📡 MCP endpoint: http://${HOST}:${PORT}/mcp`);
      console.log(`❤️  Health check: http://${HOST}:${PORT}/health`);
      console.log('='.repeat(60));
      console.log('');
      console.log('Test with MCP Inspector:');
      console.log(`  npx @modelcontextprotocol/inspector`);
      console.log(`  Select "Streamable HTTP" and enter: http://localhost:${PORT}/mcp`);
      console.log('');

      // Pre-warm the GitHub index cache so first tool call is fast
      warmCache();
    });
  })
  .catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });

// Note: SIGTERM/SIGINT handlers are registered above (lines ~160-170) to save analytics on exit
