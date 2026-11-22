import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';
import { API_BASE_URL } from './config.js';
import { describeApiError, todayInMalaysia, toMalayPlaceName } from './utils/api.js';
import { searchableText } from './utils/search.js';
// Weather API endpoints - using realtime API endpoints
const WEATHER_FORECAST_ENDPOINT = '/weather/forecast';
const WEATHER_WARNING_ENDPOINT = '/weather/warning';
const EARTHQUAKE_WARNING_ENDPOINT = '/weather/warning/earthquake';

// Most earthquake records returned per call
const MAX_EARTHQUAKES = 100;

interface ForecastRow {
  location?: { location_id?: string; location_name?: string };
  date?: string;
  [key: string]: unknown;
}

const textResult = (text: string) => ({ content: [{ type: 'text' as const, text }] });

export function registerWeatherTools(server: McpServer) {
  // Get weather forecast
  server.tool(
    prefixToolName('get_weather_forecast'),
    'Gets weather forecast for Malaysia',
    {
      location: z.string().describe('Location name (e.g., "Kuala Lumpur", "Penang")'),
      days: z.number().min(1).max(7).optional().describe('Number of days to forecast (1-7)'),
    },
    async ({ location, days = 3 }) => {
      try {
        const url = `${API_BASE_URL}${WEATHER_FORECAST_ENDPOINT}`;
        const response = await axios.get(url, {
          params: {
            // icontains = case-insensitive partial match. MET Malaysia uses Malay
            // names, so "Penang" is searched as "Pinang" ("Pulau Pinang").
            icontains: `${toMalayPlaceName(location)}@location__location_name`,
            sort: 'date',
            limit: 500,
          },
        });
        const rows: ForecastRow[] = Array.isArray(response.data) ? response.data : [];

        // The API returns a 7-day forecast per location. Keep the next `days`
        // days (from today, Malaysia time) for each matching location.
        // (Previously `days` was sent as the API's row limit, which returned the
        // LAST days of the week, mixed across locations.)
        const today = todayInMalaysia();
        const perLocation = new Map<string, ForecastRow[]>();
        for (const row of rows) {
          if (typeof row.date !== 'string' || row.date < today) continue;
          const key = row.location?.location_id ?? row.location?.location_name ?? 'unknown';
          const kept = perLocation.get(key) ?? [];
          if (kept.length < days) kept.push(row);
          perLocation.set(key, kept);
        }
        const forecast = [...perLocation.values()].flat();

        if (forecast.length === 0) {
          return textResult(JSON.stringify({
            message: `No forecast found for "${location}". MET Malaysia uses Malay place names, e.g. "Pulau Pinang", "Melaka", "Johor Bahru".`,
            data: [],
          }, null, 2));
        }

        return textResult(JSON.stringify(forecast, null, 2));
      } catch (error) {
        return textResult(`Error fetching weather forecast: ${describeApiError(error)}`);
      }
    }
  );

  // Get weather warnings
  server.tool(
    prefixToolName('get_weather_warnings'),
    'Gets current weather warnings for Malaysia',
    {
      type: z.string().optional().describe('Word to match in the warning title (e.g., "rain", "thunderstorm", "wind", "cyclone"), or "all"'),
      location: z.string().optional().describe('Location name to filter warnings'),
    },
    async ({ type = 'all', location }) => {
      try {
        const url = `${API_BASE_URL}${WEATHER_WARNING_ENDPOINT}`;
        const params: Record<string, unknown> = { limit: 100 };

        if (type && type.toLowerCase() !== 'all') {
          // Case-insensitive, so "rain" matches "Continuous Rain Warning"
          params.icontains = `${type}@warning_issue__title_en`;
        }

        const response = await axios.get(url, { params });
        let warnings: Array<Record<string, unknown>> = Array.isArray(response.data) ? response.data : [];

        // The API accepts only ONE icontains filter (two comma-joined ones give
        // HTTP 400), so the location is matched here, in the warning text.
        if (location) {
          const place = toMalayPlaceName(location).toLowerCase();
          warnings = warnings.filter(w =>
            searchableText(w.text_en).includes(place) || searchableText(w.heading_en).includes(place)
          );
        }

        return textResult(JSON.stringify(warnings, null, 2));
      } catch (error) {
        return textResult(`Error fetching weather warnings: ${describeApiError(error)}`);
      }
    }
  );

  // Get earthquake warnings
  server.tool(
    prefixToolName('get_earthquake_warnings'),
    'Gets earthquake warnings for Malaysia',
    {
      days: z.number().min(1).max(30).optional().describe('Number of days to look back (1-30)'),
      magnitude: z.number().min(0).optional().describe('Minimum magnitude to include'),
    },
    async ({ days = 7, magnitude = 4.0 }) => {
      try {
        const url = `${API_BASE_URL}${EARTHQUAKE_WARNING_ENDPOINT}`;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const params = {
          meta: true,
          limit: 1000,
          sort: '-utcdatetime', // newest first
          timestamp_start: `${since.toISOString().slice(0, 19).replace('T', ' ')}@utcdatetime`,
        };

        const response = await axios.get(url, { params });
        const rows: Array<Record<string, unknown>> = Array.isArray(response.data?.data) ? response.data.data : [];

        // The API has no magnitude filter (number_min is silently ignored), so
        // the minimum magnitude is applied here.
        const quakes = rows
          .filter(r => typeof r.magdefault === 'number' && r.magdefault >= magnitude)
          .slice(0, MAX_EARTHQUAKES);

        return textResult(JSON.stringify({
          meta: { days, magnitude_min: magnitude, count: quakes.length, newest_first: true },
          data: quakes,
        }, null, 2));
      } catch (error) {
        return textResult(`Error fetching earthquake warnings: ${describeApiError(error)}`);
      }
    }
  );
}
