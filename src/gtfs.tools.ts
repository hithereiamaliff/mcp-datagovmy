import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import JSZip from 'jszip';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

// API Base URL for Malaysia Open Data API
const API_BASE_URL = 'https://api.data.gov.my';

// GTFS endpoints
const GTFS_STATIC_ENDPOINT = '/gtfs-static';
const GTFS_REALTIME_ENDPOINT = '/gtfs-realtime/vehicle-position';
const GTFS_TRIP_UPDATES_ENDPOINT = '/gtfs-realtime/trip-update';

// Geocoding APIs
const GOOGLE_MAPS_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

// Google Maps API Key from environment variable
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Determine which geocoding service to use
const USE_GOOGLE_MAPS = !!GOOGLE_MAPS_API_KEY;

if (!USE_GOOGLE_MAPS) {
  console.log('No Google Maps API key found. Using Nominatim API for geocoding as fallback.');
} else {
  console.log('Using Google Maps API for geocoding.');
}

// Valid providers and categories
const VALID_PROVIDERS = ['mybas-johor', 'ktmb', 'prasarana'];

// Valid categories for Prasarana
const PRASARANA_CATEGORIES = [
  'rapid-bus-penang',
  'rapid-bus-kuantan',
  'rapid-bus-mrtfeeder',
  'rapid-rail-kl',
  'rapid-bus-kl'
];

// Common name mappings to help with user queries
const PROVIDER_MAPPINGS: Record<string, { provider: string; category?: string }> = {
  // Direct provider mappings
  'mybas': { provider: 'mybas-johor' },
  'mybas johor': { provider: 'mybas-johor' },
  'mybas johor bahru': { provider: 'mybas-johor' },
  'ktmb': { provider: 'ktmb' },
  'ktm': { provider: 'ktmb' },
  'keretapi tanah melayu': { provider: 'ktmb' },
  'keretapi tanah melayu berhad': { provider: 'ktmb' },
  'prasarana': { provider: 'prasarana' },
  
  // Prasarana services (mapped to provider + category)
  'rapid rail': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid rail kl': { provider: 'prasarana', category: 'rapid-rail-kl' },
  'rapid bus kl': { provider: 'prasarana', category: 'rapid-bus-kl' },
  'rapid penang': { provider: 'prasarana', category: 'rapid-bus-penang' },
  'rapid bus penang': { provider: 'prasarana', category: 'rapid-bus-penang' },
  'rapid kuantan': { provider: 'prasarana', category: 'rapid-bus-kuantan' },
  'rapid bus kuantan': { provider: 'prasarana', category: 'rapid-bus-kuantan' },
  'mrt feeder': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' },
  'rapid feeder': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' },
  'rapid feeder kl': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' },
  'rapid bus mrt feeder': { provider: 'prasarana', category: 'rapid-bus-mrtfeeder' }
};

/**
 * Normalize provider and category from user input
 * @param provider Provider name from user input
 * @param category Optional category from user input
 * @returns Normalized provider and category
 */
function normalizeProviderAndCategory(provider: string, category?: string): { provider: string; category?: string; error?: string } {
  // Convert to lowercase for case-insensitive matching
  const normalizedProvider = provider.toLowerCase();
  
  // Check if this is a known provider/service in our mappings
  if (PROVIDER_MAPPINGS[normalizedProvider]) {
    return PROVIDER_MAPPINGS[normalizedProvider];
  }
  
  // If not in mappings, check if it's a valid provider
  if (!VALID_PROVIDERS.includes(provider)) {
    return {
      provider,
      category,
      error: `Invalid provider: ${provider}. Valid providers are: ${VALID_PROVIDERS.join(', ')}`
    };
  }
  
  // For prasarana, validate the category
  if (provider === 'prasarana') {
    if (!category) {
      return {
        provider,
        error: 'Category parameter is required for prasarana provider'
      };
    }
    
    if (!PRASARANA_CATEGORIES.includes(category)) {
      return {
        provider,
        category,
        error: `Invalid category for prasarana: ${category}. Valid categories are: ${PRASARANA_CATEGORIES.join(', ')}`
      };
    }
  }
  
  // Return normalized values
  return { provider, category };
}

// Cache for GTFS data to avoid repeated downloads and parsing
const gtfsCache = {
  static: new Map<string, { data: any; timestamp: number }>(),
  realtime: new Map<string, { data: any; timestamp: number }>(),
  tripUpdates: new Map<string, { data: any; timestamp: number }>(),
};

// Cache expiry times (in milliseconds)
const STATIC_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const REALTIME_CACHE_EXPIRY = 30 * 1000; // 30 seconds
const TRIP_UPDATES_CACHE_EXPIRY = 30 * 1000; // 30 seconds

/**
 * Parse CSV data from a readable stream
 * @param stream Readable stream containing CSV data
 * @returns Promise resolving to an array of parsed objects
 */
async function parseCsv(stream: Readable): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Parse GTFS Static data from a ZIP file
 * @param buffer Buffer containing the ZIP file
 * @returns Promise resolving to parsed GTFS data
 */
async function parseGtfsStaticZip(buffer: Buffer): Promise<Record<string, any[]>> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(buffer);
  const result: Record<string, any[]> = {};
  
  // List of core GTFS files to parse
  const coreFiles = [
    'agency.txt',
    'stops.txt',
    'routes.txt',
    'trips.txt',
    'stop_times.txt',
    'calendar.txt',
    'calendar_dates.txt',
    'shapes.txt',
    'frequencies.txt',
  ];
  
  // Parse each file in the ZIP
  for (const fileName of Object.keys(contents.files)) {
    // Skip directories and non-core files
    if (contents.files[fileName].dir || !coreFiles.includes(fileName)) {
      continue;
    }
    
    try {
      // Get file content as text
      const fileData = await contents.files[fileName].async('nodebuffer');
      const stream = Readable.from(fileData);
      
      // Parse CSV data
      const parsedData = await parseCsv(stream);
      
      // Store parsed data
      const fileNameWithoutExt = fileName.replace('.txt', '');
      result[fileNameWithoutExt] = parsedData;
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
    }
  }
  
  return result;
}

/**
 * Enhance location query with Malaysian context if needed
 * @param query Original location query
 * @returns Enhanced query with better context for geocoding
 */
function enhanceLocationQuery(query: string): string {
  // Don't modify if already contains state/country information
  const malaysianStates = ['penang', 'pulau pinang', 'selangor', 'kuala lumpur', 'kl', 'johor', 'kedah', 'kelantan', 
                          'melaka', 'malacca', 'negeri sembilan', 'pahang', 'perak', 'perlis', 'sabah', 
                          'sarawak', 'terengganu', 'labuan', 'putrajaya'];
  
  // Check if query already contains state information
  const lowercaseQuery = query.toLowerCase();
  const hasStateInfo = malaysianStates.some(state => lowercaseQuery.includes(state));
  
  if (hasStateInfo || lowercaseQuery.includes('malaysia')) {
    return query; // Already has sufficient context
  }
  
  // Special handling for specific hotels in Penang
  const penangHotels = [
    'hompton hotel', 'cititel', 'g hotel', 'eastern & oriental', 'e&o hotel', 'shangri-la', 
    'shangri la', 'holiday inn', 'tune hotel', 'hotel jen', 'the light', 'lexis suites', 
    'hard rock hotel', 'bayview', 'equatorial', 'four points', 'vouk hotel', 'neo+', 'neo plus',
    'royale chulan', 'the wembley', 'sunway hotel', 'hotel royal', 'st giles', 'flamingo'
  ];
  
  // Check if query contains any Penang hotel names
  if (penangHotels.some(hotel => lowercaseQuery.includes(hotel))) {
    return `${query}, Penang, Malaysia`;
  }
  
  // Check for common hotel chains or landmarks that might need context
  if (lowercaseQuery.includes('hotel') || 
      lowercaseQuery.includes('mall') || 
      lowercaseQuery.includes('airport')) {
    
    // Check for Penang-specific locations
    if (lowercaseQuery.includes('bayan lepas') || 
        lowercaseQuery.includes('georgetown') || 
        lowercaseQuery.includes('george town') || 
        lowercaseQuery.includes('butterworth') ||
        lowercaseQuery.includes('bukit mertajam') ||
        lowercaseQuery.includes('batu ferringhi')) {
      return `${query}, Penang, Malaysia`;
    }
    
    // Add Malaysia as context to improve geocoding results
    return `${query}, Malaysia`;
  }
  
  return query;
}

/**
 * Geocode a location name to coordinates using either Google Maps or Nominatim API
 * @param query Location name to geocode
 * @param country Optional country code to limit results (e.g., 'my' for Malaysia)
 * @returns Promise with coordinates or null if not found
 */
async function geocodeLocation(query: string, country: string = 'my'): Promise<{ lat: number; lon: number } | null> {
  try {
    // Enhance the query with better context
    const enhancedQuery = enhanceLocationQuery(query);
    
    // Use Google Maps API if API key is available, otherwise use Nominatim
    if (USE_GOOGLE_MAPS) {
      return await geocodeWithGoogleMaps(enhancedQuery, query, country);
    } else {
      return await geocodeWithNominatim(enhancedQuery, query, country);
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Geocode using Google Maps API
 */
async function geocodeWithGoogleMaps(enhancedQuery: string, originalQuery: string, country: string): Promise<{ lat: number; lon: number } | null> {
  // Build URL with parameters for Google Maps API
  const params = new URLSearchParams({
    address: enhancedQuery,
    components: `country:${country}`,
    key: GOOGLE_MAPS_API_KEY
  });
  
  // Make request to Google Maps Geocoding API
  console.log(`Geocoding with Google Maps API: "${enhancedQuery}"`);
  const response = await axios.get(`${GOOGLE_MAPS_GEOCODING_API}?${params.toString()}`);
  
  // Check if we got any results
  if (response.data && 
      response.data.status === 'OK' && 
      response.data.results && 
      response.data.results.length > 0) {
    
    const result = response.data.results[0];
    const location = result.geometry.location;
    
    console.log(`Google Maps found location: ${result.formatted_address}`);
    
    return {
      lat: location.lat,
      lon: location.lng
    };
  } else {
    console.log(`Google Maps API returned status: ${response.data.status}`);
  }
  
  // If enhanced query failed and it was different from original, try the original
  if (enhancedQuery !== originalQuery) {
    console.log(`Enhanced query failed, trying original query: ${originalQuery}`);
    
    const originalParams = new URLSearchParams({
      address: originalQuery,
      components: `country:${country}`,
      key: GOOGLE_MAPS_API_KEY
    });
    
    const originalResponse = await axios.get(`${GOOGLE_MAPS_GEOCODING_API}?${originalParams.toString()}`);
    
    if (originalResponse.data && 
        originalResponse.data.status === 'OK' && 
        originalResponse.data.results && 
        originalResponse.data.results.length > 0) {
      
      const result = originalResponse.data.results[0];
      const location = result.geometry.location;
      
      console.log(`Google Maps found location with original query: ${result.formatted_address}`);
      
      return {
        lat: location.lat,
        lon: location.lng
      };
    } else {
      console.log(`Google Maps API returned status for original query: ${originalResponse.data.status}`);
    }
  }
  
  return null;
}

/**
 * Geocode using Nominatim API (OpenStreetMap)
 */
async function geocodeWithNominatim(enhancedQuery: string, originalQuery: string, country: string): Promise<{ lat: number; lon: number } | null> {
  // Build URL with parameters for Nominatim
  const params = new URLSearchParams({
    q: enhancedQuery,
    format: 'json',
    limit: '1',
    countrycodes: country,
  });
  
  // Make request to Nominatim API
  console.log(`Geocoding with Nominatim API: "${enhancedQuery}"`);
  const response = await axios.get(`${NOMINATIM_API}?${params.toString()}`, {
    headers: {
      'User-Agent': 'Malaysia-Open-Data-MCP-Server/1.0',
    },
  });
  
  // Check if we got any results
  if (response.data && response.data.length > 0) {
    const result = response.data[0];
    console.log(`Nominatim found location: ${result.display_name}`);
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
  }
  
  // If enhanced query failed and it was different from original, try the original
  if (enhancedQuery !== originalQuery) {
    console.log(`Enhanced query failed, trying original query with Nominatim: ${originalQuery}`);
    const originalParams = new URLSearchParams({
      q: originalQuery,
      format: 'json',
      limit: '1',
      countrycodes: country,
    });
    
    const originalResponse = await axios.get(`${NOMINATIM_API}?${originalParams.toString()}`, {
      headers: {
        'User-Agent': 'Malaysia-Open-Data-MCP-Server/1.0',
      },
    });
    
    if (originalResponse.data && originalResponse.data.length > 0) {
      const result = originalResponse.data[0];
      console.log(`Nominatim found location with original query: ${result.display_name}`);
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
    }
  }
  
  return null;
}

/**
 * Calculate the Haversine distance between two points in kilometers
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  lat1 = toRadians(lat1);
  lat2 = toRadians(lat2);
  
  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in kilometers
  const R = 6371;
  
  // Distance in kilometers
  return R * c;
}

/**
 * Register GTFS tools with the MCP server
 * @param server MCP server instance
 */
export function registerGtfsTools(server: McpServer) {
  // Parse GTFS Static data
  server.tool(
    'parse_gtfs_static',
    'Parse GTFS Static data for a specific transport provider. IMPORTANT: For transit queries like "Show me routes from Rapid Penang", use get_transit_routes directly with the provider name. This is a low-level tool - prefer using get_transit_routes or get_transit_stops for most user queries.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      force_refresh: z.boolean().optional().describe('Force refresh the cache'),
    },
    async ({ provider, category, force_refresh = false }) => {
      try {
        // Normalize provider and category
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Check cache if not forcing refresh
        if (!force_refresh && gtfsCache.static.has(cacheKey)) {
          const cached = gtfsCache.static.get(cacheKey)!;
          
          // Return cached data if not expired
          if (Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Successfully retrieved GTFS static data from cache',
                    data: cached.data,
                    cached: true,
                    timestamp: cached.timestamp,
                  }, null, 2),
                },
              ],
            };
          }
        }
        
        // Build URL
        let url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
        
        if (category) {
          url += `?category=${category}`;
        }
        
        // Download ZIP file
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        // Parse GTFS data
        const gtfsData = await parseGtfsStaticZip(Buffer.from(response.data));
        
        // Cache the result
        gtfsCache.static.set(cacheKey, {
          data: gtfsData,
          timestamp: Date.now(),
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully parsed GTFS static data for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                data: gtfsData,
                cached: false,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to parse GTFS static data',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}${category ? `?category=${category}` : ''}`,
                response_data: responseData,
                provider_info: {
                  provider,
                  category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Parse GTFS Realtime data
  server.tool(
    'parse_gtfs_realtime',
    'Parse GTFS Realtime data for a specific transport provider. IMPORTANT: For transit queries like "Show me bus locations from Rapid Penang", use this tool directly with the provider name. Common names like "rapid penang", "rapid kuantan", or "mybas johor" are automatically mapped to the correct provider-category pairs.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      force_refresh: z.boolean().optional().describe('Force refresh the cache'),
    },
    async ({ provider, category, force_refresh = false }) => {
      try {
        // Normalize provider and category
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Check cache if not forcing refresh
        if (!force_refresh && gtfsCache.realtime.has(cacheKey)) {
          const cached = gtfsCache.realtime.get(cacheKey)!;
          
          // Return cached data if not expired
          if (Date.now() - cached.timestamp < REALTIME_CACHE_EXPIRY) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Successfully retrieved GTFS realtime data from cache',
                    data: cached.data,
                    cached: true,
                    timestamp: cached.timestamp,
                  }, null, 2),
                },
              ],
            };
          }
        }
        
        // Build URL
        let url = `${API_BASE_URL}${GTFS_REALTIME_ENDPOINT}/${provider}`;
        
        if (category) {
          url += `?category=${category}`;
        }
        
        // Download Protocol Buffer data
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        // Parse Protocol Buffer data
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
          new Uint8Array(response.data)
        );
        
        // Convert to plain JavaScript object
        const vehiclePositions = feed.entity.map(entity => {
          if (!entity.vehicle) {
            return null;
          }
          
          const vehicle = entity.vehicle;
          return {
            id: entity.id,
            vehicle: {
              trip: vehicle.trip ? {
                tripId: vehicle.trip.tripId,
                routeId: vehicle.trip.routeId,
                directionId: vehicle.trip.directionId,
                startTime: vehicle.trip.startTime,
                startDate: vehicle.trip.startDate,
                scheduleRelationship: vehicle.trip.scheduleRelationship,
              } : undefined,
              position: vehicle.position ? {
                latitude: vehicle.position.latitude,
                longitude: vehicle.position.longitude,
                bearing: vehicle.position.bearing,
                speed: vehicle.position.speed,
              } : undefined,
              currentStopSequence: vehicle.currentStopSequence,
              stopId: vehicle.stopId,
              currentStatus: vehicle.currentStatus,
              timestamp: vehicle.timestamp ? new Date(typeof vehicle.timestamp === 'number' ? vehicle.timestamp * 1000 : (vehicle.timestamp as any).low * 1000).toISOString() : undefined,
              congestionLevel: vehicle.congestionLevel,
              occupancyStatus: vehicle.occupancyStatus,
            },
          };
        }).filter(Boolean);
        
        // Cache the result
        gtfsCache.realtime.set(cacheKey, {
          data: vehiclePositions,
          timestamp: Date.now(),
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully parsed GTFS realtime data for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                data: vehiclePositions,
                cached: false,
                count: vehiclePositions.length,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to parse GTFS realtime data',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: `${API_BASE_URL}${GTFS_REALTIME_ENDPOINT}/${provider}${category ? `?category=${category}` : ''}`,
                response_data: responseData,
                provider_info: {
                  provider,
                  category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Get transit routes
  server.tool(
    'get_transit_routes',
    'Get transit routes from GTFS data. IMPORTANT: For transit route queries like "Show me routes from Rapid Penang", use this tool directly with the provider name. The tool supports common names like "rapid penang", "rapid kuantan", "ktmb", or "mybas johor" which will be automatically mapped to the correct provider and category. No need to use list_transport_agencies first.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      route_id: z.string().optional().describe('Specific route ID to retrieve (optional)'),
    },
    async ({ provider, category, route_id }) => {
      try {
        // Normalize provider and category
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Check if we have cached GTFS data
        let gtfsData;
        if (gtfsCache.static.has(cacheKey)) {
          const cached = gtfsCache.static.get(cacheKey)!;
          
          // Use cached data if not expired
          if (Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
            gtfsData = cached.data;
          }
        }
        
        // If no cached data, fetch and parse GTFS data
        if (!gtfsData) {
          // Build URL
          let url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
          
          if (category) {
            url += `?category=${category}`;
          }
          
          // Download ZIP file
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          
          // Parse GTFS data
          gtfsData = await parseGtfsStaticZip(Buffer.from(response.data));
          
          // Cache the result
          gtfsCache.static.set(cacheKey, {
            data: gtfsData,
            timestamp: Date.now(),
          });
        }
        
        // Extract routes data
        const routes = gtfsData.routes || [];
        
        // Filter by route_id if provided
        const filteredRoutes = route_id
          ? routes.filter((route: { route_id: string }) => route.route_id === route_id)
          : routes;
        
        // Add trips information to each route
        const routesWithTrips = filteredRoutes.map((route: { route_id: string }) => {
          const trips = (gtfsData.trips || [])
            .filter((trip: { route_id: string }) => trip.route_id === route.route_id);
          
          return {
            ...route,
            trips_count: trips.length,
          };
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully retrieved routes for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                data: routesWithTrips,
                count: routesWithTrips.length,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to retrieve transit routes',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}${category ? `?category=${category}` : ''}`,
                response_data: responseData,
                provider_info: {
                  provider,
                  category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Get transit stops
  server.tool(
    'get_transit_stops',
    'Get transit stops from GTFS data. IMPORTANT: For transit stop queries like "Show me bus stops for Rapid Penang", use this tool directly with the provider name. The tool supports common names like "rapid penang", "rapid kuantan", "ktmb", or "mybas johor" which will be automatically mapped to the correct provider and category. No need to use list_transport_agencies first.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      route_id: z.string().optional().describe('Filter stops by route ID (optional)'),
      stop_id: z.string().optional().describe('Specific stop ID to retrieve (optional)'),
    },
    async ({ provider, category, route_id, stop_id }) => {
      try {
        // Normalize provider and category
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Check if we have cached GTFS data
        let gtfsData;
        if (gtfsCache.static.has(cacheKey)) {
          const cached = gtfsCache.static.get(cacheKey)!;
          
          // Use cached data if not expired
          if (Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
            gtfsData = cached.data;
          }
        }
        
        // If no cached data, fetch and parse GTFS data
        if (!gtfsData) {
          // Build URL
          let url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
          
          if (category) {
            url += `?category=${category}`;
          }
          
          // Download ZIP file
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          
          // Parse GTFS data
          gtfsData = await parseGtfsStaticZip(Buffer.from(response.data));
          
          // Cache the result
          gtfsCache.static.set(cacheKey, {
            data: gtfsData,
            timestamp: Date.now(),
          });
        }
        
        // Extract stops data
        const stops = gtfsData.stops || [];
        
        // Filter by stop_id if provided
        let filteredStops = stop_id
          ? stops.filter((stop: { stop_id: string }) => stop.stop_id === stop_id)
          : stops;
        
        // If route_id is provided, filter stops by route
        if (route_id) {
          // Get trips for the route
          const routeTrips = (gtfsData.trips || [])
            .filter((trip: { route_id: string; trip_id: string }) => trip.route_id === route_id)
            .map((trip: { trip_id: string }) => trip.trip_id);
          
          // Get stop_times for the trips
          const stopTimes = (gtfsData.stop_times || [])
            .filter((stopTime: { trip_id: string }) => routeTrips.includes(stopTime.trip_id));
          
          // Get stop_ids from stop_times
          const stopIds = [...new Set(stopTimes.map((stopTime: { stop_id: string }) => stopTime.stop_id))];
          
          // Filter stops by stop_ids
          filteredStops = filteredStops.filter((stop: { stop_id: string }) => stopIds.includes(stop.stop_id));
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully retrieved stops for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                data: filteredStops,
                count: filteredStops.length,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to retrieve transit stops',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}${category ? `?category=${category}` : ''}`,
                response_data: responseData,
                provider_info: {
                  provider,
                  category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Get transit arrivals
  server.tool(
    'get_transit_arrivals',
    'Get real-time transit arrivals at a specific stop. IMPORTANT: Use this tool directly for queries like "When will the next bus arrive at my stop?" or "Show me arrival times for Rapid Penang buses at stop X".',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana", or common names like "rapid penang")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      stop_id: z.string().describe('ID of the stop to get arrivals for'),
      route_id: z.string().optional().describe('Optional: filter arrivals by route'),
      limit: z.number().optional().describe('Maximum number of arrivals to return (default: 10)'),
    },
    async ({ provider, category, stop_id, route_id, limit = 10 }) => {
      try {
        // Normalize provider and category
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Get static GTFS data (for stop and route information)
        let gtfsStaticData;
        if (gtfsCache.static.has(cacheKey)) {
          const cached = gtfsCache.static.get(cacheKey)!;
          
          // Use cached data if not expired
          if (Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
            gtfsStaticData = cached.data;
          }
        }
        
        // If no cached static data, fetch and parse GTFS static data
        if (!gtfsStaticData) {
          // Build URL
          let url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
          
          if (category) {
            url += `?category=${category}`;
          }
          
          // Download ZIP file
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          
          // Parse GTFS data
          gtfsStaticData = await parseGtfsStaticZip(Buffer.from(response.data));
          
          // Cache the result
          gtfsCache.static.set(cacheKey, {
            data: gtfsStaticData,
            timestamp: Date.now(),
          });
        }
        
        // Get trip updates data (for real-time arrivals)
        let tripUpdatesData: any[] = [];
        if (gtfsCache.tripUpdates.has(cacheKey)) {
          const cached = gtfsCache.tripUpdates.get(cacheKey)!;
          
          // Use cached data if not expired
          if (Date.now() - cached.timestamp < TRIP_UPDATES_CACHE_EXPIRY) {
            tripUpdatesData = cached.data;
          }
        }
        
        // If no cached trip updates data, fetch and parse GTFS trip updates
        if (!tripUpdatesData) {
          // Build URL
          let url = `${API_BASE_URL}${GTFS_TRIP_UPDATES_ENDPOINT}/${provider}`;
          
          if (category) {
            url += `?category=${category}`;
          }
          
          try {
            // Download Protocol Buffer data
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            
            // Parse Protocol Buffer data
            const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
              new Uint8Array(response.data)
            );
            
            // Convert to plain JavaScript object
            tripUpdatesData = feed.entity.map(entity => {
              if (!entity.tripUpdate) {
                return null;
              }
              
              const tripUpdate = entity.tripUpdate;
              return {
                id: entity.id,
                tripUpdate: {
                  trip: tripUpdate.trip ? {
                    tripId: tripUpdate.trip.tripId,
                    routeId: tripUpdate.trip.routeId,
                    directionId: tripUpdate.trip.directionId,
                    startTime: tripUpdate.trip.startTime,
                    startDate: tripUpdate.trip.startDate,
                    scheduleRelationship: tripUpdate.trip.scheduleRelationship,
                  } : undefined,
                  stopTimeUpdate: tripUpdate.stopTimeUpdate ? tripUpdate.stopTimeUpdate.map(update => ({
                    stopSequence: update.stopSequence,
                    stopId: update.stopId,
                    arrival: update.arrival ? {
                      delay: update.arrival.delay,
                      time: update.arrival.time ? new Date(typeof update.arrival.time === 'number' ? update.arrival.time * 1000 : (update.arrival.time as any).low * 1000).toISOString() : undefined,
                      uncertainty: update.arrival.uncertainty,
                    } : undefined,
                    departure: update.departure ? {
                      delay: update.departure.delay,
                      time: update.departure.time ? new Date(typeof update.departure.time === 'number' ? update.departure.time * 1000 : (update.departure.time as any).low * 1000).toISOString() : undefined,
                      uncertainty: update.departure.uncertainty,
                    } : undefined,
                    scheduleRelationship: update.scheduleRelationship,
                  })) : [],
                  timestamp: tripUpdate.timestamp ? new Date(typeof tripUpdate.timestamp === 'number' ? tripUpdate.timestamp * 1000 : (tripUpdate.timestamp as any).low * 1000).toISOString() : undefined,
                  delay: tripUpdate.delay,
                }
              };
            }).filter(Boolean);
            
            // Cache the result
            gtfsCache.tripUpdates.set(cacheKey, {
              data: tripUpdatesData,
              timestamp: Date.now(),
            });
          } catch (error) {
            // If trip updates are not available, set to empty array
            tripUpdatesData = [];
            
            // Still cache the empty result to avoid repeated failed requests
            gtfsCache.tripUpdates.set(cacheKey, {
              data: tripUpdatesData,
              timestamp: Date.now(),
            });
            
            console.error(`Error fetching trip updates for ${provider}${category ? `, category: ${category}` : ''}:`, error);
          }
        }
        
        // Get stop information
        const stops = gtfsStaticData.stops || [];
        const stop = stops.find((s: any) => s.stop_id === stop_id);
        
        if (!stop) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `Stop ID ${stop_id} not found for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                  valid_stop_ids: stops.map((s: any) => s.stop_id).slice(0, 10),
                  total_stops: stops.length,
                }, null, 2),
              },
            ],
          };
        }
        
        // Filter trip updates for the specified stop
        const arrivalsForStop = [];
        
        for (const entity of tripUpdatesData || []) {
          if (!entity?.tripUpdate?.stopTimeUpdate) continue;
          
          // Find updates for this stop
          const stopUpdates = entity.tripUpdate.stopTimeUpdate.filter((update: any) => 
            update.stopId === stop_id
          );
          
          if (stopUpdates.length === 0) continue;
          
          // Skip if route_id filter is provided and doesn't match
          if (route_id && entity.tripUpdate.trip?.routeId !== route_id) continue;
          
          // Get route information
          const routes = gtfsStaticData.routes || [];
          const route = routes.find((r: any) => r.route_id === entity.tripUpdate.trip?.routeId);
          
          // Add to arrivals list
          for (const update of stopUpdates) {
            arrivalsForStop.push({
              trip_id: entity.tripUpdate.trip?.tripId,
              route_id: entity.tripUpdate.trip?.routeId,
              route_short_name: route?.route_short_name,
              route_long_name: route?.route_long_name,
              direction_id: entity.tripUpdate.trip?.directionId,
              arrival_time: update.arrival?.time,
              arrival_delay: update.arrival?.delay,
              departure_time: update.departure?.time,
              departure_delay: update.departure?.delay,
              stop_sequence: update.stopSequence,
              schedule_relationship: update.scheduleRelationship,
            });
          }
        }
        
        // Sort by arrival time
        arrivalsForStop.sort((a: any, b: any) => {
          const timeA = a.arrival_time || a.departure_time || '';
          const timeB = b.arrival_time || b.departure_time || '';
          return timeA.localeCompare(timeB);
        });
        
        // Limit results
        const limitedArrivals = arrivalsForStop.slice(0, limit);
        
        // Calculate time until arrival
        const now = Date.now();
        const arrivalsWithCountdown = limitedArrivals.map((arrival: any) => {
          const arrivalTime = arrival.arrival_time ? new Date(arrival.arrival_time).getTime() : null;
          const departureTime = arrival.departure_time ? new Date(arrival.departure_time).getTime() : null;
          const nextTime = arrivalTime || departureTime;
          
          let minutesUntil = null;
          if (nextTime) {
            minutesUntil = Math.round((nextTime - now) / (60 * 1000));
          }
          
          return {
            ...arrival,
            minutes_until_arrival: minutesUntil,
          };
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully retrieved arrivals for stop: ${stop_id} (${stop.stop_name})`,
                stop: stop,
                arrivals: arrivalsWithCountdown,
                count: arrivalsWithCountdown.length,
                current_time: new Date().toISOString(),
                note: arrivalsWithCountdown.length === 0 ? "No upcoming arrivals found for this stop. This could be due to no scheduled service or no real-time data available." : undefined,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to get transit arrivals',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: `${API_BASE_URL}${GTFS_TRIP_UPDATES_ENDPOINT}/${provider}${category ? `?category=${category}` : ''}`,
                response_data: responseData,
                provider_info: {
                  provider,
                  category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Search transit stops by location name
  server.tool(
    'search_transit_stops_by_location',
    'Search for transit stops near a named location. IMPORTANT: Use this tool for queries like "Show me bus stops near KLCC" or "What buses stop at KL Sentral?" This tool geocodes the location name to coordinates, then finds nearby stops.',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana", or common names like "rapid penang")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      location: z.string().describe('Location name to search for (e.g., "KLCC", "KL Sentral", "Penang Airport")'),
      country: z.string().optional().describe('Country code to limit geocoding results (default: "my" for Malaysia)'),
      limit: z.number().optional().describe('Maximum number of stops to return (default: 5)'),
      max_distance: z.number().optional().describe('Maximum distance in kilometers (default: 5)'),
      include_arrivals: z.boolean().optional().describe('Whether to include upcoming arrivals for each stop (default: true)'),
      arrivals_limit: z.number().optional().describe('Maximum number of arrivals to include per stop (default: 3)'),
    },
    async ({ provider, category, location, country = 'my', limit = 5, max_distance = 5, include_arrivals = true, arrivals_limit = 3 }) => {
      // Store normalized values at function scope so they're available in catch block
      let normalizedProvider = provider;
      let normalizedCategory = category;
      
      try {
        // Step 1: Normalize provider and category first
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // Update function scope variables for catch block
        normalizedProvider = normalized.provider;
        normalizedCategory = normalized.category;
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Step 2: Geocode the location name to coordinates
        console.log(`Attempting to geocode location: ${location}`);
        const coordinates = await geocodeLocation(location, country);
        
        if (!coordinates) {
          // Provide helpful suggestions for common locations
          let suggestion = `Please try a different location name or provide more specific details.`;
          
          // Special handling for Penang hotels
          if (location.toLowerCase().includes('hotel') && !location.toLowerCase().includes('penang')) {
            suggestion = `Try adding 'Penang' to your search, e.g., "${location}, Penang".`;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `Could not geocode location: "${location}". ${suggestion}`,
                  location,
                  country,
                  provider_info: {
                    provider: normalizedProvider,
                    category: normalizedCategory,
                    valid_providers: VALID_PROVIDERS,
                    valid_categories: PRASARANA_CATEGORIES
                  },
                  suggestion
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Get static GTFS data
        let gtfsStaticData;
        if (gtfsCache.static.has(cacheKey)) {
          const cached = gtfsCache.static.get(cacheKey)!;
          
          // Use cached data if not expired
          if (Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
            gtfsStaticData = cached.data;
          }
        }
        
        // If no cached data, fetch and parse GTFS static data
        if (!gtfsStaticData) {
          // Build URL
          let url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
          
          if (category) {
            url += `?category=${category}`;
          }
          
          // Download ZIP file
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          
          // Parse GTFS data
          gtfsStaticData = await parseGtfsStaticZip(Buffer.from(response.data));
          
          // Cache the result
          gtfsCache.static.set(cacheKey, {
            data: gtfsStaticData,
            timestamp: Date.now(),
          });
        }
        
        // Step 3: Extract stops from GTFS data
        const stops = gtfsStaticData.stops || [];
        
        if (stops.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `No stops found for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                  provider,
                  category,
                }, null, 2),
              },
            ],
          };
        }
        
        // Step 4: Calculate distances from user location to each stop
        const stopsWithDistance = stops.map((stop: any) => {
          // Skip stops without coordinates
          if (!stop.stop_lat || !stop.stop_lon) {
            return null;
          }
          
          const distance = haversineDistance(
            coordinates.lat,
            coordinates.lon,
            parseFloat(stop.stop_lat),
            parseFloat(stop.stop_lon)
          );
          
          return {
            ...stop,
            distance_km: distance,
            distance_m: Math.round(distance * 1000),
          };
        }).filter(Boolean);
        
        // Step 5: Filter stops by max distance and sort by proximity
        const nearbyStops = stopsWithDistance
          .filter((stop: any) => stop.distance_km <= max_distance)
          .sort((a: any, b: any) => a.distance_km - b.distance_km)
          .slice(0, limit);
        
        if (nearbyStops.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `No stops found within ${max_distance} km of "${location}"`,
                  location,
                  coordinates,
                  provider,
                  category,
                  max_distance,
                  suggestion: 'Try increasing the max_distance parameter or searching for a different location.',
                }, null, 2),
              },
            ],
          };
        }
        
        // Step 6: If requested, get real-time arrivals for each stop
        let stopsWithArrivals = nearbyStops;
        
        if (include_arrivals) {
          // Get trip updates data (for real-time arrivals)
          let tripUpdatesData: any[] = [];
          if (gtfsCache.tripUpdates.has(cacheKey)) {
            const cached = gtfsCache.tripUpdates.get(cacheKey)!;
            
            // Use cached data if not expired
            if (Date.now() - cached.timestamp < TRIP_UPDATES_CACHE_EXPIRY) {
              tripUpdatesData = cached.data;
            }
          }
          
          // If no cached trip updates data, fetch and parse GTFS trip updates
          if (!tripUpdatesData || tripUpdatesData.length === 0) {
            // Build URL
            let url = `${API_BASE_URL}${GTFS_TRIP_UPDATES_ENDPOINT}/${provider}`;
            
            if (category) {
              url += `?category=${category}`;
            }
            
            try {
              // Download Protocol Buffer data
              const response = await axios.get(url, { responseType: 'arraybuffer' });
              
              // Parse Protocol Buffer data
              const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
                new Uint8Array(response.data)
              );
              
              // Convert to plain JavaScript object
              tripUpdatesData = feed.entity.map(entity => {
                if (!entity.tripUpdate) {
                  return null;
                }
                
                const tripUpdate = entity.tripUpdate;
                return {
                  id: entity.id,
                  tripUpdate: {
                    trip: tripUpdate.trip ? {
                      tripId: tripUpdate.trip.tripId,
                      routeId: tripUpdate.trip.routeId,
                      directionId: tripUpdate.trip.directionId,
                      startTime: tripUpdate.trip.startTime,
                      startDate: tripUpdate.trip.startDate,
                      scheduleRelationship: tripUpdate.trip.scheduleRelationship,
                    } : undefined,
                    stopTimeUpdate: tripUpdate.stopTimeUpdate ? tripUpdate.stopTimeUpdate.map(update => ({
                      stopSequence: update.stopSequence,
                      stopId: update.stopId,
                      arrival: update.arrival ? {
                        delay: update.arrival.delay,
                        time: update.arrival.time ? new Date(typeof update.arrival.time === 'number' ? update.arrival.time * 1000 : (update.arrival.time as any).low * 1000).toISOString() : undefined,
                        uncertainty: update.arrival.uncertainty,
                      } : undefined,
                      departure: update.departure ? {
                        delay: update.departure.delay,
                        time: update.departure.time ? new Date(typeof update.departure.time === 'number' ? update.departure.time * 1000 : (update.departure.time as any).low * 1000).toISOString() : undefined,
                        uncertainty: update.departure.uncertainty,
                      } : undefined,
                      scheduleRelationship: update.scheduleRelationship,
                    })) : [],
                    timestamp: tripUpdate.timestamp ? new Date(typeof tripUpdate.timestamp === 'number' ? tripUpdate.timestamp * 1000 : (tripUpdate.timestamp as any).low * 1000).toISOString() : undefined,
                    delay: tripUpdate.delay,
                  }
                };
              }).filter(Boolean);
              
              // Cache the result
              gtfsCache.tripUpdates.set(cacheKey, {
                data: tripUpdatesData,
                timestamp: Date.now(),
              });
            } catch (error) {
              // If trip updates are not available, set to empty array
              tripUpdatesData = [];
              
              // Still cache the empty result to avoid repeated failed requests
              gtfsCache.tripUpdates.set(cacheKey, {
                data: tripUpdatesData,
                timestamp: Date.now(),
              });
              
              console.error(`Error fetching trip updates for ${provider}${category ? `, category: ${category}` : ''}:`, error);
            }
          }
          
          // Get routes information for better display
          const routes = gtfsStaticData.routes || [];
          
          // Add arrivals to each stop
          stopsWithArrivals = nearbyStops.map((stop: any) => {
            // Find arrivals for this stop
            const arrivalsForStop: any[] = [];
            
            for (const entity of tripUpdatesData || []) {
              if (!entity?.tripUpdate?.stopTimeUpdate) continue;
              
              // Find updates for this stop
              const stopUpdates = entity.tripUpdate.stopTimeUpdate.filter((update: any) => 
                update.stopId === stop.stop_id
              );
              
              if (stopUpdates.length === 0) continue;
              
              // Get route information
              const route = routes.find((r: any) => r.route_id === entity.tripUpdate.trip?.routeId);
              
              // Add to arrivals list
              for (const update of stopUpdates) {
                arrivalsForStop.push({
                  trip_id: entity.tripUpdate.trip?.tripId,
                  route_id: entity.tripUpdate.trip?.routeId,
                  route_short_name: route?.route_short_name,
                  route_long_name: route?.route_long_name,
                  direction_id: entity.tripUpdate.trip?.directionId,
                  arrival_time: update.arrival?.time,
                  arrival_delay: update.arrival?.delay,
                  departure_time: update.departure?.time,
                  departure_delay: update.departure?.delay,
                  stop_sequence: update.stopSequence,
                  schedule_relationship: update.scheduleRelationship,
                });
              }
            }
            
            // Sort by arrival time
            arrivalsForStop.sort((a: any, b: any) => {
              const timeA = a.arrival_time || a.departure_time || '';
              const timeB = b.arrival_time || b.departure_time || '';
              return timeA.localeCompare(timeB);
            });
            
            // Limit results
            const limitedArrivals = arrivalsForStop.slice(0, arrivals_limit);
            
            // Calculate time until arrival
            const now = Date.now();
            const arrivalsWithCountdown = limitedArrivals.map((arrival: any) => {
              const arrivalTime = arrival.arrival_time ? new Date(arrival.arrival_time).getTime() : null;
              const departureTime = arrival.departure_time ? new Date(arrival.departure_time).getTime() : null;
              const nextTime = arrivalTime || departureTime;
              
              let minutesUntil = null;
              if (nextTime) {
                minutesUntil = Math.round((nextTime - now) / (60 * 1000));
              }
              
              return {
                ...arrival,
                minutes_until_arrival: minutesUntil,
              };
            });
            
            return {
              ...stop,
              upcoming_arrivals: arrivalsWithCountdown,
              has_realtime_data: arrivalsWithCountdown.length > 0,
            };
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Found ${stopsWithArrivals.length} stops near "${location}"`,
                location,
                coordinates,
                provider,
                category,
                stops: stopsWithArrivals,
                count: stopsWithArrivals.length,
                include_arrivals,
                current_time: new Date().toISOString(),
                search_parameters: {
                  max_distance,
                  limit,
                  arrivals_limit: include_arrivals ? arrivals_limit : undefined,
                },
                note: stopsWithArrivals.some((s: any) => s.has_realtime_data) ? undefined : "No real-time arrival data available for these stops.",
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        // Try to parse the Buffer data if present
        let parsedResponseData = responseData;
        if (responseData && responseData.type === 'Buffer' && Array.isArray(responseData.data)) {
          try {
            const buffer = Buffer.from(responseData.data);
            parsedResponseData = JSON.parse(buffer.toString());
          } catch (parseError) {
            console.error('Error parsing buffer data:', parseError);
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to search transit stops by location',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                response_data: parsedResponseData,
                location,
                provider_info: {
                  provider: normalizedProvider,
                  category: normalizedCategory,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                suggestion: 'Make sure you are using a valid category for the provider. For Prasarana, use one of: ' + PRASARANA_CATEGORIES.join(', ') + '. For location-based searches, try adding more context like city or state name.'
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Find nearest transit stops
  server.tool(
    'find_nearest_transit_stops',
    'Find the nearest transit stops to a given location. IMPORTANT: Use this tool directly for queries like "Where is the nearest bus stop to my location?" or "How do I get to the nearest Rapid Penang bus stop?"',
    {
      provider: z.string().describe('Provider name (e.g., "mybas-johor", "ktmb", "prasarana", or common names like "rapid penang")'),
      category: z.string().optional().describe('Category for Prasarana data (required only for prasarana provider)'),
      latitude: z.number().describe('Latitude of the user\'s location'),
      longitude: z.number().describe('Longitude of the user\'s location'),
      limit: z.number().optional().describe('Maximum number of stops to return (default: 5)'),
      max_distance: z.number().optional().describe('Maximum distance in kilometers (default: 5)'),
    },
    async ({ provider, category, latitude, longitude, limit = 5, max_distance = 5 }) => {
      try {
        // Normalize provider and category
        const normalized = normalizeProviderAndCategory(provider, category);
        
        // If there's an error, return it
        if (normalized.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: normalized.error,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES,
                  common_names: Object.keys(PROVIDER_MAPPINGS),
                  example: normalized.provider === 'prasarana' ? {
                    provider: 'prasarana',
                    category: 'rapid-rail-kl'
                  } : undefined
                }, null, 2),
              },
            ],
          };
        }
        
        // Use normalized values
        provider = normalized.provider;
        category = normalized.category;
        
        // Build cache key
        const cacheKey = category ? `${provider}_${category}` : provider;
        
        // Check if we have cached GTFS data
        let gtfsData;
        if (gtfsCache.static.has(cacheKey)) {
          const cached = gtfsCache.static.get(cacheKey)!;
          
          // Use cached data if not expired
          if (Date.now() - cached.timestamp < STATIC_CACHE_EXPIRY) {
            gtfsData = cached.data;
          }
        }
        
        // If no cached data, fetch and parse GTFS data
        if (!gtfsData) {
          // Build URL
          let url = `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}`;
          
          if (category) {
            url += `?category=${category}`;
          }
          
          // Download ZIP file
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          
          // Parse GTFS data
          gtfsData = await parseGtfsStaticZip(Buffer.from(response.data));
          
          // Cache the result
          gtfsCache.static.set(cacheKey, {
            data: gtfsData,
            timestamp: Date.now(),
          });
        }
        
        // Extract stops data
        const stops = gtfsData.stops || [];
        
        // Calculate distance for each stop
        const stopsWithDistance = stops.map((stop: any) => {
          // Skip stops without lat/lon
          if (!stop.stop_lat || !stop.stop_lon) {
            return { ...stop, distance: Infinity };
          }
          
          // Calculate distance using Haversine formula
          const stopLat = parseFloat(stop.stop_lat);
          const stopLon = parseFloat(stop.stop_lon);
          
          // Haversine formula
          const R = 6371; // Earth radius in km
          const dLat = (stopLat - latitude) * Math.PI / 180;
          const dLon = (stopLon - longitude) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(latitude * Math.PI / 180) * Math.cos(stopLat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c; // Distance in km
          
          return { ...stop, distance };
        });
        
        // Filter by max distance and sort by distance
        const nearestStops = stopsWithDistance
          .filter((stop: any) => stop.distance <= max_distance)
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, limit);
        
        // Format distances to be more readable
        const formattedStops = nearestStops.map((stop: any) => ({
          ...stop,
          distance_km: parseFloat(stop.distance.toFixed(2)),
          distance_m: parseFloat((stop.distance * 1000).toFixed(0)),
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully found nearest stops for provider: ${provider}${category ? `, category: ${category}` : ''}`,
                data: formattedStops,
                count: formattedStops.length,
                user_location: { latitude, longitude },
                provider_info: { provider, category },
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        // Check if it's an axios error with response data
        const axiosError = error as any;
        const statusCode = axiosError?.response?.status;
        const responseData = axiosError?.response?.data;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Failed to find nearest transit stops',
                error: error instanceof Error ? error.message : 'Unknown error',
                status_code: statusCode,
                api_url: `${API_BASE_URL}${GTFS_STATIC_ENDPOINT}/${provider}${category ? `?category=${category}` : ''}`,
                response_data: responseData,
                provider_info: {
                  provider,
                  category,
                  valid_providers: VALID_PROVIDERS,
                  valid_categories: PRASARANA_CATEGORIES
                },
                note: "If you're getting a 404 error, please check that the provider and category are correct. For Prasarana, a valid category is required."
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
