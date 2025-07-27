import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

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

export function registerParquetTools(server: McpServer) {
  // Get information about a parquet file from a URL
  server.tool(
    'get_parquet_info',
    'Get metadata and estimated structure information about a Parquet file',
    {
      url: z.string().url().describe('URL of the parquet file to analyze'),
    },
    async ({ url }) => {
      try {
        // Get metadata about the parquet file
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
          note: 'Parquet files cannot be directly parsed in this environment. This is an estimation based on the filename and common patterns.',
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
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to process parquet file',
                message: error instanceof Error ? error.message : String(error),
                url,
                timestamp: new Date().toISOString(),
                note: 'Parquet files can be viewed through their corresponding dashboards on data.gov.my',
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // Link to dashboard for a parquet file
  server.tool(
    'find_dashboard_for_parquet',
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
              }, null, 2),
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
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
