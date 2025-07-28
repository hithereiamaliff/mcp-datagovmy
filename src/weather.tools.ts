import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { prefixToolName } from './utils/tool-naming.js';

// API Base URL for Malaysia Open Data API
const API_BASE_URL = 'https://api.data.gov.my';
// Weather API endpoints - using realtime API endpoints
const WEATHER_FORECAST_ENDPOINT = '/weather/forecast';
const WEATHER_WARNING_ENDPOINT = '/weather/warning';
const EARTHQUAKE_WARNING_ENDPOINT = '/weather/warning/earthquake';

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
        const params: Record<string, any> = { limit: 100 };
        
        if (location) {
          params.contains = `${location}@location__location_name`;
        }
        
        if (days) {
          params.limit = days;
        }

        const response = await axios.get(url, { params });
        const data = response.data;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get weather warnings
  server.tool(
    prefixToolName('get_weather_warnings'),
    'Gets current weather warnings for Malaysia',
    {
      type: z.string().optional().describe('Type of warning (e.g., "rain", "flood", "all")'),
      location: z.string().optional().describe('Location name to filter warnings'),
    },
    async ({ type = 'all', location }) => {
      try {
        const url = `${API_BASE_URL}${WEATHER_WARNING_ENDPOINT}`;
        const params: Record<string, any> = { limit: 100 };
        
        if (type && type !== 'all') {
          params.contains = `${type}@warning_issue__title_en`;
        }
        
        if (location) {
          params.contains = `${location}@text_en`;
        }

        const response = await axios.get(url, { params });
        const data = response.data;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching weather warnings: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
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
        const params: Record<string, any> = { limit: 100, meta: true };
        
        if (days) {
          // Convert days to timestamp for filtering
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - days);
          params.timestamp_start = pastDate.toISOString().split('T')[0] + ' 00:00:00@utcdatetime';
        }
        
        if (magnitude) {
          params.number_min = `${magnitude}@magdefault`;
        }

        const response = await axios.get(url, { params });
        const data = response.data;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching earthquake warnings: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
