import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { API_BASE_URL } from './config.js';
import { describeApiError, toMalayPlaceName } from './utils/api.js';
import { searchableText } from './utils/search.js';
const FLOOD_WARNING_ENDPOINT = '/flood-warning';

// Water levels above normal, most serious first. These are what count as "warnings".
const ELEVATED_LEVELS = ['DANGER', 'WARNING', 'ALERT'];

// If the newest station reading is older than this, the response flags the data as stale
const STALE_AFTER_HOURS = 24;

type Station = Record<string, unknown>;

const textResult = (text: string) => ({ content: [{ type: 'text' as const, text }] });

/** The station fields worth showing (the raw record has ~30 fields; all stations = 1.2 MB). */
function summarizeStation(s: Station) {
  return {
    station_name: s.station_name,
    district: s.district,
    state: s.state,
    river_basin: s.main_basin,
    water_level_status: s.water_level_indicator,
    water_level_current: s.water_level_current,
    thresholds: {
      normal: s.water_level_normal_level,
      alert: s.water_level_alert_level,
      warning: s.water_level_warning_level,
      danger: s.water_level_danger_level,
    },
    trend: s.water_level_trend,
    reading_time: s.water_level_update_datetime,
    latitude: s.latitude,
    longitude: s.longitude,
  };
}

/** Newest reading time among the stations, e.g. "2024-02-23 14:45:00" (Malaysia time). */
function newestReading(stations: Station[]): string | undefined {
  let newest: string | undefined;
  for (const s of stations) {
    const t = s.water_level_update_datetime;
    if (typeof t === 'string' && (!newest || t > newest)) newest = t;
  }
  return newest;
}

/** Hours between a Malaysia-time reading like "2024-02-23 14:45:00" and now. */
function hoursSince(readingInMalaysiaTime: string): number {
  const time = Date.parse(`${readingInMalaysiaTime.replace(' ', 'T')}+08:00`);
  return Number.isNaN(time) ? Infinity : (Date.now() - time) / 3_600_000;
}

/** Position of a level in ELEVATED_LEVELS (lower = more serious); other levels sort last. */
function severityRank(s: Station): number {
  const index = ELEVATED_LEVELS.indexOf(String(s.water_level_indicator).toUpperCase());
  return index === -1 ? ELEVATED_LEVELS.length : index;
}

/**
 * Register flood warning tools with the MCP server
 * @param server MCP server instance
 */
export function registerFloodTools(server: McpServer) {
  server.tool(
    prefixToolName('get_flood_warnings'),
    'Gets flood warnings for Malaysia: river stations whose water level is above normal (ALERT, WARNING or DANGER). Also reports how recent the readings are.',
    {
      state: z.string().optional().describe('State name to filter warnings (e.g., "Selangor", "Johor")'),
      district: z.string().optional().describe('District name to filter warnings'),
      severity: z.string().optional().describe('Water level status to filter: "alert", "warning", "danger", "normal" or "error"'),
      include_normal: z.boolean().optional().describe('Also return stations at normal level (default false)'),
      limit: z.number().min(1).max(500).optional().describe('Maximum number of stations to return (default 100)'),
    },
    async ({ state, district, severity, include_normal = false, limit = 100 }) => {
      try {
        const url = `${API_BASE_URL}${FLOOD_WARNING_ENDPOINT}`;
        const params: Record<string, unknown> = { meta: true };

        // States are stored in capitals ("PULAU PINANG", "WILAYAH PERSEKUTUAN KUALA
        // LUMPUR"), so use a case-insensitive partial match. The API accepts only one
        // such filter (comma-joined ones give HTTP 400), so district and severity
        // are filtered below. (The old code sent "severity" as a column that doesn't
        // exist, and an exact, case-sensitive state match that never matched.)
        if (state) params.icontains = `${toMalayPlaceName(state)}@state`;

        const response = await axios.get(url, { params });
        let stations: Station[] = Array.isArray(response.data?.data) ? response.data.data : [];

        if (district) {
          const wanted = district.trim().toLowerCase();
          stations = stations.filter(s => searchableText(s.district).includes(wanted));
        }

        // Overview of every level in the selected area, before filtering by level
        const countsByLevel: Record<string, number> = {};
        for (const s of stations) {
          const level = typeof s.water_level_indicator === 'string' && s.water_level_indicator
            ? s.water_level_indicator
            : 'UNKNOWN';
          countsByLevel[level] = (countsByLevel[level] ?? 0) + 1;
        }

        // Upstream has stopped updating before (the newest reading on 22 Nov 2026
        // was from Feb 2024), so always say how fresh the data is.
        const newest = newestReading(stations);
        const staleWarning = newest && hoursSince(newest) > STALE_AFTER_HOURS
          ? `The newest station reading is from ${newest} (Malaysia time), so these are NOT current conditions. ` +
            'For live river levels see https://publicinfobanjir.water.gov.my'
          : undefined;

        if (severity) {
          const wanted = severity.trim().toUpperCase();
          stations = stations.filter(s => String(s.water_level_indicator).toUpperCase() === wanted);
        } else if (!include_normal) {
          stations = stations.filter(s => ELEVATED_LEVELS.includes(String(s.water_level_indicator).toUpperCase()));
        }

        stations.sort((a, b) => severityRank(a) - severityRank(b)); // most serious first

        return textResult(JSON.stringify({
          message: 'Flood warnings retrieved successfully',
          params: { state, district, severity, include_normal, limit },
          endpoint: url,
          newest_reading: newest,
          stale_data_warning: staleWarning,
          counts_by_level: countsByLevel,
          total_matches: stations.length,
          showing: Math.min(limit, stations.length),
          warnings: stations.slice(0, limit).map(summarizeStation),
          timestamp: new Date().toISOString()
        }, null, 2));
      } catch (error) {
        console.error('Error fetching flood warnings:', describeApiError(error));

        return textResult(JSON.stringify({
          error: 'Failed to fetch flood warnings',
          message: describeApiError(error),
          status: axios.isAxiosError(error) ? error.response?.status : undefined,
          timestamp: new Date().toISOString()
        }, null, 2));
      }
    }
  );
}
