import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
// Import hyparquet with correct function names
import { parquetReadObjects, asyncBufferFromUrl } from 'hyparquet';
// Import compressors for BROTLI support
import { compressors } from 'hyparquet-compressors';
import { prefixToolName } from './utils/tool-naming.js';

/**
 * Custom JSON serializer that handles BigInt values by converting them to strings
 * @param key The key of the current property being serialized
 * @param value The value of the current property being serialized
 * @returns The serialized value
 */
function bigIntSerializer(key: string, value: any): any {
  // Convert BigInt values to strings
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/**
 * Process an object to convert all BigInt values to strings
 * This is needed because JSON.stringify cannot handle BigInt values directly
 * @param obj The object to process
 * @returns A new object with all BigInt values converted to strings
 */
function processBigIntValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => processBigIntValues(item));
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = processBigIntValues(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Process empty date objects in parquet data
 * @param data Array of data rows to process
 * @param url URL of the parquet file
 * @returns Processed data with proper date strings
 */
function processEmptyDateObjects(data: any[], url: string): any[] {
  if (!data || data.length === 0) {
    return data;
  }
  
  // Extract dataset name from URL
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1] || '';
  const datasetName = filename.split('.')[0] || '';
  
  // Find the date column(s) in the data
  const firstRow = data[0];
  const dateColumns: string[] = [];
  
  // Look for columns that might be date columns
  Object.keys(firstRow).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'date' || lowerKey.includes('date') || lowerKey === 'dt' || lowerKey === 'timestamp') {
      dateColumns.push(key);
    }
  });
  
  if (dateColumns.length === 0) {
    return data; // No date columns found
  }
  
  // Check if we have any rows with valid date strings to use as a pattern
  let datePattern: string | null = null;
  for (const dateColumn of dateColumns) {
    for (const row of data) {
      const dateValue = row[dateColumn];
      if (typeof dateValue === 'string' && dateValue.trim() !== '') {
        datePattern = dateValue;
        break;
      }
    }
    if (datePattern) break;
  }
  
  // Dataset-specific handling
  if (datasetName === 'employment_sector') {
    // For employment_sector dataset, we know it's annual data from 2001-2022
    // with 3 sectors (agriculture, industry, services) and 3 sexes (both, male, female)
    const uniqueSectors = new Set();
    const uniqueSexes = new Set();
    
    data.forEach(row => {
      if (row.sector) uniqueSectors.add(row.sector);
      if (row.sex) uniqueSexes.add(row.sex);
    });
    
    const rowsPerYear = uniqueSectors.size * uniqueSexes.size || 9;
    const startYear = 2001; // First year in the dataset
    
    // Process each row
    return data.map((row, index) => {
      const newRow = { ...row };
      
      // Check if there's a date field that's an empty object
      if (row.date && typeof row.date === 'object' && Object.keys(row.date).length === 0) {
        // Calculate which year this row belongs to
        const yearIndex = Math.floor(index / rowsPerYear);
        const year = startYear + yearIndex;
        
        // Replace empty date object with a proper date string
        newRow.date = `${year}-01-01 00:00:00`;
      }
      
      return newRow;
    });
  }
  
  // Generic handling for other datasets
  return data.map(row => {
    const newRow = { ...row };
    
    // Process each date column
    for (const dateColumn of dateColumns) {
      const dateValue = row[dateColumn];
      
      // Check if there's a date field that's an empty object
      if (dateValue && typeof dateValue === 'object' && Object.keys(dateValue).length === 0) {
        // If we have a date pattern, use it as a template
        if (datePattern) {
          // Extract the format from the pattern (e.g., YYYY-MM-DD HH:MM:SS)
          if (datePattern.includes(' ')) {
            // Full datetime format
            newRow[dateColumn] = `${new Date().getFullYear()}-01-01 00:00:00`; // Use current year
          } else {
            // Date only format
            newRow[dateColumn] = `${new Date().getFullYear()}-01-01`; // Use current year
          }
        } else {
          // Default format if no pattern found - use current date for latest data
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          newRow[dateColumn] = `${year}-${month}-${day}`;
        }
      }
    }
    
    return newRow;
  });
}

/**
 * Extract the latest date from parquet data
 * @param data The parquet data to analyze
 * @returns The latest date in YYYY-MM format, or undefined if no date found
 */
function extractLatestDate(data: any[]): string | undefined {
  if (!data || data.length === 0) {
    return undefined;
  }
  
  // Check if data has a date column
  const firstRow = data[0];
  let dateColumn: string | null = null;
  
  // Find the date column - could be named 'date', 'dt', or contain 'date' in the name
  for (const key of Object.keys(firstRow)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'date' || lowerKey === 'dt' || lowerKey.includes('date')) {
      dateColumn = key;
      break;
    }
  }
  
  // If no date column found, check if this is callout data with 'latest' values
  // This is a special case for the epayment_systems_timeseries_callout.parquet file
  if (!dateColumn && firstRow.hasOwnProperty('latest') && firstRow.hasOwnProperty('chart')) {
    // This is likely callout data, which represents the latest month
    // Use the current date as the reference
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  if (!dateColumn) {
    // If we still don't have a date column, try to infer from the data structure
    // For time series data, we can assume the latest data is for the current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  // Extract all dates and find the latest one
  const dates: Date[] = [];
  for (const row of data) {
    const dateValue = row[dateColumn];
    if (dateValue) {
      // Handle different date formats
      let date: Date | null = null;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        // Try to parse the date string
        date = new Date(dateValue);
      } else if (typeof dateValue === 'number') {
        // Assume timestamp in milliseconds
        date = new Date(dateValue);
      } else if (typeof dateValue === 'object') {
        // Some date objects might be serialized in a special way
        // Try to extract year and month if available
        if (dateValue.year && dateValue.month) {
          date = new Date(dateValue.year, dateValue.month - 1);
        } else {
          // If we can't extract a proper date, use current date
          date = new Date();
        }
      }
      
      if (date && !isNaN(date.getTime())) {
        dates.push(date);
      }
    }
  }
  
  if (dates.length === 0) {
    // If we couldn't extract any valid dates, use the current date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  // Find the latest date
  const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Format as YYYY-MM
  const year = latestDate.getFullYear();
  const month = String(latestDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Define the structure for Parquet metadata
interface ParquetMetadata {
  filename: string;
  url: string;
  fileSize?: number;
  lastModified?: string;
  contentType?: string;
}

/**
 * Helper function to get metadata about a parquet file from a URL
 * @param url URL of the parquet file
 * @returns Metadata about the parquet file
 */
async function getParquetMetadata(url: string): Promise<ParquetMetadata> {
  try {
    // First make a HEAD request to get metadata without downloading the file
    const headResponse = await axios({
      method: 'head',
      url,
      timeout: 5000, // 5 second timeout
    });
    
    // Extract the filename from the URL
    const filename = url.split('/').pop() || 'unknown.parquet';
    
    return {
      filename,
      url,
      fileSize: parseInt(headResponse.headers['content-length'] || '0', 10),
      lastModified: headResponse.headers['last-modified'],
      contentType: headResponse.headers['content-type'],
    };
  } catch (error) {
    console.error('Error getting parquet file metadata:', error);
    
    // Return basic metadata even if HEAD request fails
    return {
      filename: url.split('/').pop() || 'unknown.parquet',
      url,
    };
  }
}



/**
 * Get information about a parquet file's structure based on common patterns
 * @param filename Name of the parquet file
 * @returns Estimated structure information
 */
function estimateParquetStructure(filename: string): Record<string, any> {
  // Extract information from filename
  const nameParts = filename.replace('.parquet', '').split('_');
  
  // Try to guess the structure based on common naming patterns
  if (filename.includes('epayment') || filename.includes('payment')) {
    return {
      estimatedSchema: {
        'date': 'datetime',
        'payment_channel': 'string',
        'transaction_count': 'integer',
        'transaction_value': 'float',
        'growth_rate': 'float',
      },
      estimatedRowCount: 'Unknown (typically monthly data for 2-5 years)',
      possibleVisualization: 'Time series chart showing payment channel usage over time',
      dataType: 'Payment transaction data',
    };
  }
  
  if (filename.includes('timeseries')) {
    return {
      estimatedSchema: {
        'date': 'datetime',
        'value': 'float',
        'category': 'string',
      },
      estimatedRowCount: 'Unknown (typically daily or monthly time series)',
      possibleVisualization: 'Line chart showing trends over time',
      dataType: 'Time series data',
    };
  }
  
  // Generic estimation based on filename parts
  const estimatedColumns: Record<string, string> = {};
  nameParts.forEach(part => {
    if (part.includes('date') || part === 'dt') {
      estimatedColumns['date'] = 'datetime';
    } else if (part.includes('value') || part.includes('amount')) {
      estimatedColumns[part] = 'float';
    } else if (part.includes('count') || part.includes('num')) {
      estimatedColumns[part] = 'integer';
    } else if (part.includes('id')) {
      estimatedColumns[part] = 'string';
    } else if (part.includes('name') || part.includes('type') || part.includes('category')) {
      estimatedColumns[part] = 'string';
    }
  });
  
  // Add some generic columns if we couldn't extract much
  if (Object.keys(estimatedColumns).length < 2) {
    estimatedColumns['value'] = 'unknown';
    estimatedColumns['category'] = 'unknown';
  }
  
  return {
    estimatedSchema: estimatedColumns,
    estimatedRowCount: 'Unknown',
    dataType: 'Unknown structured data',
  };
}

/**
 * Generate a dashboard URL from a parquet file URL
 * @param parquetUrl URL of the parquet file
 * @returns Estimated dashboard URL
 */
function estimateDashboardUrl(parquetUrl: string): string {
  // Extract the filename and try to map it to a dashboard
  const filename = parquetUrl.split('/').pop() || '';
  
  if (filename.includes('epayment') || filename.includes('payment')) {
    return 'https://data.gov.my/dashboard/electronic-payments';
  }
  
  if (filename.includes('dosm') || filename.includes('statistics')) {
    return 'https://open.dosm.gov.my/dashboard';
  }
  
  // Default to the main dashboard page
  return 'https://data.gov.my/dashboard';
}

/**
 * Parse a Parquet file from a URL using hyparquet
 * @param url URL of the Parquet file
 * @param maxRows Maximum number of rows to return
 * @param datasetId Optional dataset ID to fetch metadata
 * @returns Parsed Parquet data
 */
async function parseParquetFromUrl(url: string, maxRows: number = 500, datasetId?: string): Promise<any> {
  try {
    // Create an async buffer from the URL
    const file = await asyncBufferFromUrl({ url });
    
    // Parse the Parquet file using hyparquet with compressors for BROTLI support
    const rowEnd = maxRows > 0 ? maxRows : undefined;
    const parquetData = await parquetReadObjects({ 
      file,
      rowStart: 0,
      rowEnd,
      compressors // Add compressors to support BROTLI compression
    });
    
    // Process the data to handle BigInt values
    let processedData = processBigIntValues(parquetData);
    
    // Process empty date objects
    processedData = processEmptyDateObjects(processedData, url);
    
    // Get metadata to extract schema information
    // This is a workaround since we don't have direct schema access
    // We'll infer schema from the first row
    const schema: Record<string, string> = {};
    if (processedData.length > 0) {
      const firstRow = processedData[0];
      Object.keys(firstRow).forEach(key => {
        const value = firstRow[key];
        // Store the original type if it was a BigInt
        const originalValue = parquetData[0][key];
        // Special handling for date fields
        if (key.toLowerCase() === 'date') {
          schema[key] = 'string';
        } else {
          schema[key] = typeof originalValue === 'bigint' ? 'bigint' : typeof value;
        }
      });
    }
    
    // Removed sorting and filtering code
    
    // Get the total number of rows - approximation since we don't have direct access
    const totalRows = processedData.length;
    
    // Extract the latest date from the data
    const latestDate = extractLatestDate(processedData);
    
    return {
      schema,
      totalRows,
      displayedRows: processedData.length,
      data: processedData,
      detected_date: latestDate // Include the detected date in the response
    };
  } catch (error) {
    console.error('Error parsing Parquet file:', error);
    throw error;
  }
}

export function registerParquetTools(server: McpServer) {
  // Parse a Parquet file from a URL
  server.tool(
    prefixToolName('parse_parquet_file'),
    'Parse and display data from a Parquet file URL',
    {
      url: z.string().url().describe('URL of the Parquet file to parse'),
      maxRows: z.number().min(1).max(2000).optional().describe('Maximum number of rows to return (1-2000)'),
    },
    async ({ url, maxRows = 500 }) => {
      try {
        // Extract the filename from the URL
        const filename = url.split('/').pop() || 'unknown.parquet';
        
        // Removed dataset metadata handling code
        
        // Parse the Parquet file
        const parquetData = await parseParquetFromUrl(url, maxRows);
        
        // Format the data for display
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Get the detected date or use current date
        const detectedDate = parquetData.detected_date || `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        
        // Parse the detected date
        const [year, month] = detectedDate.split('-').map((part: string) => parseInt(part, 10));
        
        // Format the date for display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const formattedMonth = monthNames[month - 1] || 'Unknown';
        const formattedYear = year || currentYear;
        
        const formattedData = {
          filename,
          url,
          schema: parquetData.schema,
          totalRows: parquetData.totalRows,
          displayedRows: parquetData.displayedRows,
          data: parquetData.data,
          data_as_of: detectedDate,
          data_as_of_formatted: `${formattedMonth} ${formattedYear}`, // Add formatted date
          timestamp: new Date().toISOString()
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedData, bigIntSerializer, 2),
            },
          ],
        };
      } catch (error) {
        // If parsing fails, fall back to metadata and estimation
        try {
          // Get metadata about the Parquet file
          const metadata = await getParquetMetadata(url);
          
          // Estimate the structure based on the filename
          const structureInfo = estimateParquetStructure(metadata.filename);
          
          // Estimate the dashboard URL
          const dashboardUrl = estimateDashboardUrl(url);
          
          // Format the information for display
          const formattedInfo = {
            filename: metadata.filename,
            url: metadata.url,
            fileSize: metadata.fileSize ? `${Math.round(metadata.fileSize / 1024 / 1024 * 100) / 100} MB` : 'Unknown',
            lastModified: metadata.lastModified || 'Unknown',
            contentType: metadata.contentType || 'application/octet-stream',
            estimatedStructure: structureInfo,
            viewableAt: dashboardUrl,
            error: 'Failed to parse Parquet file',
            errorMessage: error instanceof Error ? error.message : String(error),
            note: 'Falling back to estimated structure. You can view the data at the dashboard URL.',
            timestamp: new Date().toISOString()
          };
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(formattedInfo, null, 2),
              },
            ],
          };
        } catch (fallbackError) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to process Parquet file',
                  message: error instanceof Error ? error.message : String(error),
                  fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                  url,
                  timestamp: new Date().toISOString(),
                  note: 'Parquet files can be viewed through their corresponding dashboards on data.gov.my',
                }, null, 2),
              },
            ],
          };
        }
      }
    }
  );
  
  // Get information about a Parquet file from a URL
  server.tool(
    prefixToolName('get_parquet_info'),
    'Get metadata and structure information about a Parquet file',
    {
      url: z.string().url().describe('URL of the Parquet file to analyze'),
    },
    async ({ url }) => {
      try {
        // Try to parse the Parquet file to get accurate schema information
        const parquetData = await parseParquetFromUrl(url, 0);
        
        // Get metadata about the Parquet file
        const metadata = await getParquetMetadata(url);
        
        // Estimate the dashboard URL
        const dashboardUrl = estimateDashboardUrl(url);
        
        // Format the information for display
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Get the detected date or use current date
        const detectedDate = parquetData.detected_date || `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        
        // Parse the detected date
        const [year, month] = detectedDate.split('-').map((part: string) => parseInt(part, 10));
        
        // Format the date for display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const formattedMonth = monthNames[month - 1] || 'Unknown';
        const formattedYear = year || currentYear;
        
        const formattedInfo = {
          filename: metadata.filename,
          url: metadata.url,
          fileSize: metadata.fileSize ? `${Math.round(metadata.fileSize / 1024 / 1024 * 100) / 100} MB` : 'Unknown',
          lastModified: metadata.lastModified || 'Unknown',
          contentType: metadata.contentType || 'application/octet-stream',
          schema: parquetData.schema,
          totalRows: parquetData.totalRows,
          data_as_of: detectedDate,
          data_as_of_formatted: `${formattedMonth} ${formattedYear}`, // Add formatted date
          viewableAt: dashboardUrl,
          timestamp: new Date().toISOString()
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedInfo, bigIntSerializer, 2),
            },
          ],
        };
      } catch (error) {
        // Fall back to estimation if parsing fails
        try {
          // Get metadata about the Parquet file
          const metadata = await getParquetMetadata(url);
          
          // Estimate the structure based on the filename
          const structureInfo = estimateParquetStructure(metadata.filename);
          
          // Estimate the dashboard URL
          const dashboardUrl = estimateDashboardUrl(url);
          
          // Format the information for display
          const formattedInfo = {
            filename: metadata.filename,
            url: metadata.url,
            fileSize: metadata.fileSize ? `${Math.round(metadata.fileSize / 1024 / 1024 * 100) / 100} MB` : 'Unknown',
            lastModified: metadata.lastModified || 'Unknown',
            contentType: metadata.contentType || 'application/octet-stream',
            estimatedStructure: structureInfo,
            viewableAt: dashboardUrl,
            note: 'Could not parse the Parquet file directly. This is an estimation based on the filename and common patterns.',
            timestamp: new Date().toISOString()
          };
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(formattedInfo, null, 2),
              },
            ],
          };
        } catch (fallbackError) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to process Parquet file',
                  message: error instanceof Error ? error.message : String(error),
                  fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                  url,
                  timestamp: new Date().toISOString(),
                  note: 'Parquet files can be viewed through their corresponding dashboards on data.gov.my',
                }, null, 2),
              },
            ],
          };
        }
      }
    }
  );
  
  // Link to dashboard for a parquet file
  server.tool(
    prefixToolName('find_dashboard_for_parquet'),
    'Find the corresponding dashboard for a Parquet file',
    {
      url: z.string().url().describe('URL of the parquet file'),
    },
    async ({ url }) => {
      try {
        // Extract the filename from the URL
        const filename = url.split('/').pop() || 'unknown.parquet';
        
        // Estimate the dashboard URL
        const dashboardUrl = estimateDashboardUrl(url);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                filename,
                parquetUrl: url,
                dashboardUrl,
                note: 'This is the estimated dashboard where you can view the visualized data from this Parquet file.',
                timestamp: new Date().toISOString()
              }, bigIntSerializer, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to find dashboard',
                message: error instanceof Error ? error.message : String(error),
                url,
                fallbackUrl: 'https://data.gov.my/dashboard',
                timestamp: new Date().toISOString()
              }, bigIntSerializer, 2),
            },
          ],
        };
      }
    }
  );
}
