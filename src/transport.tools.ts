import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { API_BASE_URL } from './config.js';
import { fetchApiRows, describeApiError } from './utils/api.js';

// data.gov.my endpoints
const DATA_CATALOGUE_ENDPOINT = '/data-catalogue';
const GTFS_STATIC_ENDPOINT = '/gtfs-static';
const GTFS_REALTIME_ENDPOINT = '/gtfs-realtime/vehicle-position';

/**
 * GTFS feeds published on data.gov.my (checked 22 Nov 2026). Prasarana needs a
 * category; the others don't. rapid-bus-kuantan has been removed upstream, and
 * rapid-rail-kl has a static timetable but no realtime vehicle-position feed.
 */
const GTFS_FEEDS: Array<{ provider: string; category?: string; name: string; realtime: boolean }> = [
  { provider: 'ktmb', name: 'KTM Berhad (KTM Komuter, ETS and intercity trains)', realtime: true },
  { provider: 'mybas-johor', name: 'myBAS Johor Bahru buses', realtime: true },
  { provider: 'prasarana', category: 'rapid-rail-kl', name: 'Rapid KL rail (LRT, MRT, Monorail)', realtime: false },
  { provider: 'prasarana', category: 'rapid-bus-kl', name: 'Rapid KL buses', realtime: true },
  { provider: 'prasarana', category: 'rapid-bus-mrtfeeder', name: 'Rapid KL MRT feeder buses', realtime: true },
  { provider: 'prasarana', category: 'rapid-bus-penang', name: 'Rapid Penang buses', realtime: true },
];

const textResult = (text: string) => ({ content: [{ type: 'text' as const, text }] });

/** Full feed URL, including the ?category= part for Prasarana. */
function feedUrl(endpoint: string, provider: string, category?: string): string {
  const base = `${API_BASE_URL}${endpoint}/${encodeURIComponent(provider)}`;
  return category ? `${base}?category=${encodeURIComponent(category)}` : base;
}

/** The published feed matching provider/category (case-insensitive), if any. */
function findFeed(provider: string, category?: string) {
  const p = provider.trim().toLowerCase();
  const c = category?.trim().toLowerCase() || undefined;
  return GTFS_FEEDS.find(f => f.provider === p && f.category === c);
}

/** Error result listing the valid provider/category combinations. */
function unknownFeedResult(provider: string, category?: string) {
  return textResult(JSON.stringify({
    error: `No GTFS feed for provider "${provider}"${category ? ` with category "${category}"` : ''}`,
    valid_feeds: GTFS_FEEDS.map(f => (f.category ? { provider: f.provider, category: f.category } : { provider: f.provider })),
  }, null, 2));
}

export function registerTransportTools(server: McpServer) {
  // List transport agencies
  server.tool(
    prefixToolName('list_transport_agencies'),
    'Lists the transport agencies whose GTFS feeds are published on data.gov.my, with their feed URLs',
    {
      limit: z.number().min(1).optional().describe('Maximum number of agencies to return'),
      offset: z.number().min(0).optional().describe('Number of agencies to skip'),
    },
    async ({ limit = 10, offset = 0 }) => {
      // The old version asked the data-catalogue API for "gtfs", which always
      // failed (HTTP 400: an id is required). The feed list is short and stable,
      // so it is kept here instead.
      const feeds = GTFS_FEEDS.slice(offset, offset + limit).map(f => ({
        provider: f.provider,
        category: f.category,
        name: f.name,
        static_url: feedUrl(GTFS_STATIC_ENDPOINT, f.provider, f.category),
        realtime_vehicle_position_url: f.realtime ? feedUrl(GTFS_REALTIME_ENDPOINT, f.provider, f.category) : null,
      }));

      return textResult(JSON.stringify({
        message: 'GTFS feeds on data.gov.my. For parsed routes, stops and vehicles use parse_gtfs_static, get_transit_routes, get_transit_stops or parse_gtfs_realtime.',
        total: GTFS_FEEDS.length,
        agencies: feeds,
      }, null, 2));
    }
  );

  // Get transport data
  server.tool(
    prefixToolName('get_transport_data'),
    'Gets rows from a data.gov.my data-catalogue dataset by ID, e.g. transport ridership datasets. (GTFS timetables are not catalogue datasets: use parse_gtfs_static and the get_transit_* tools for those.)',
    {
      dataset_id: z.string().describe('ID of a data catalogue dataset (e.g., "ridership_headline", "ridership_ktmb_daily")'),
      limit: z.number().min(1).optional().describe('Maximum number of records to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip'),
    },
    async ({ dataset_id, limit = 10, offset = 0 }) => {
      try {
        // fetchApiRows makes `offset` work (the API itself ignores it)
        const rows = await fetchApiRows(`${API_BASE_URL}${DATA_CATALOGUE_ENDPOINT}`, { id: dataset_id }, limit, offset);
        return textResult(JSON.stringify(rows, null, 2));
      } catch (error) {
        const hint = axios.isAxiosError(error) && error.response?.status === 404
          ? ' Use search_datasets_catalogue to find valid dataset IDs.'
          : '';
        return textResult(`Error fetching transport data: ${describeApiError(error)}${hint}`);
      }
    }
  );

  // GTFS Static API
  server.tool(
    prefixToolName('get_gtfs_static'),
    'Gets the download URL of the GTFS static (timetable ZIP) feed for a transport provider. For parsed data use parse_gtfs_static.',
    {
      provider: z.string().describe('Provider name: "ktmb", "mybas-johor" or "prasarana"'),
      category: z.string().optional().describe('Required for prasarana: "rapid-rail-kl", "rapid-bus-kl", "rapid-bus-mrtfeeder" or "rapid-bus-penang"'),
      limit: z.number().min(1).optional().describe('Not used (kept for compatibility)'),
      offset: z.number().min(0).optional().describe('Not used (kept for compatibility)'),
    },
    async ({ provider, category }) => {
      const feed = findFeed(provider, category);
      if (!feed) return unknownFeedResult(provider, category);

      return textResult(JSON.stringify({
        message: `GTFS static data URL for ${feed.name}`,
        url: feedUrl(GTFS_STATIC_ENDPOINT, feed.provider, feed.category),
        format: 'ZIP file (GTFS static)',
        note: 'For parsed routes and stops use parse_gtfs_static, get_transit_routes or get_transit_stops.'
      }, null, 2));
    }
  );

  // GTFS Realtime API
  server.tool(
    prefixToolName('get_gtfs_realtime_vehicle_position'),
    'Gets the URL of the GTFS realtime vehicle-position feed for a transport provider. For parsed vehicle positions use parse_gtfs_realtime.',
    {
      provider: z.string().describe('Provider name: "ktmb", "mybas-johor" or "prasarana"'),
      category: z.string().optional().describe('Required for prasarana: "rapid-bus-kl", "rapid-bus-mrtfeeder" or "rapid-bus-penang"'),
      limit: z.number().min(1).optional().describe('Not used (kept for compatibility)'),
      offset: z.number().min(0).optional().describe('Not used (kept for compatibility)'),
    },
    async ({ provider, category }) => {
      const feed = findFeed(provider, category);
      if (!feed) return unknownFeedResult(provider, category);

      if (!feed.realtime) {
        return textResult(JSON.stringify({
          error: `No realtime vehicle-position feed is published for ${feed.name}`,
          realtime_feeds: GTFS_FEEDS.filter(f => f.realtime).map(f => ({ provider: f.provider, category: f.category })),
        }, null, 2));
      }

      return textResult(JSON.stringify({
        message: `GTFS realtime vehicle position URL for ${feed.name}`,
        url: feedUrl(GTFS_REALTIME_ENDPOINT, feed.provider, feed.category),
        format: 'Protocol Buffer (GTFS realtime)',
        note: 'For parsed vehicle positions use parse_gtfs_realtime.'
      }, null, 2));
    }
  );
}
