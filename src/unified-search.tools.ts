import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Import search functions and types from both modules
import { searchDatasets, getAllDatasets, DatasetMetadata } from './datacatalogue.tools.js';
import { searchDashboards, getAllDashboards, DashboardMetadata } from './dashboards.tools.js';

// Define result interfaces
interface SearchResult {
  type: 'dataset' | 'dashboard';
  id: string;
  title: string;
  description?: string;
  url?: string;
  score: number;
}

/**
 * Unified search across both datasets and dashboards
 * @param query Search query
 * @param prioritizeType Optional type to prioritize in results ('dataset' or 'dashboard')
 * @returns Combined search results from both sources
 */
function unifiedSearch(query: string, prioritizeType?: 'dataset' | 'dashboard'): SearchResult[] {
  // Search in datasets
  const datasetResults = searchDatasets(query).map((dataset: DatasetMetadata) => ({
    type: 'dataset' as const,
    id: dataset.id,
    title: dataset.title_en,
    description: dataset.description_en,
    url: `https://data.gov.my/data-catalogue/${dataset.id}`,
    // Simple relevance score based on exact matches in title or id
    score: (
      (dataset.title_en.toLowerCase().includes(query.toLowerCase()) ? 3 : 0) +
      (dataset.id.toLowerCase().includes(query.toLowerCase()) ? 2 : 0) +
      (dataset.description_en.toLowerCase().includes(query.toLowerCase()) ? 1 : 0)
    )
  }));

  // Search in dashboards
  const dashboardResults = searchDashboards(query).map((dashboard: DashboardMetadata) => ({
    type: 'dashboard' as const,
    id: dashboard.dashboard_name,
    title: dashboard.dashboard_name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    description: dashboard.route || '',
    url: dashboard.route ? 
      (dashboard.sites?.includes('opendosm') ? `https://open.dosm.gov.my${dashboard.route}` : `https://data.gov.my${dashboard.route}`) 
      : `/dashboard/${dashboard.dashboard_name}`,
    // Simple relevance score based on exact matches in name or route
    score: (
      (dashboard.dashboard_name.toLowerCase().includes(query.toLowerCase()) ? 3 : 0) +
      (dashboard.route && dashboard.route.toLowerCase().includes(query.toLowerCase()) ? 2 : 0)
    )
  }));

  // Combine results
  let combinedResults = [...datasetResults, ...dashboardResults];

  // If a type is prioritized, boost its score
  if (prioritizeType) {
    combinedResults = combinedResults.map(result => {
      if (result.type === prioritizeType) {
        return { ...result, score: result.score + 5 };
      }
      return result;
    });
  }

  // Sort by score (descending)
  return combinedResults.sort((a, b) => b.score - a.score);
}

/**
 * Check if a query might be referring to a dashboard based on keywords
 * @param query Search query
 * @returns True if the query likely refers to a dashboard
 */
function isDashboardQuery(query: string): boolean {
  const dashboardKeywords = ['dashboard', 'chart', 'graph', 'visualization', 'visualisation', 'stats', 'statistics'];
  const lowerQuery = query.toLowerCase();
  return dashboardKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Check if a query might be referring to a dataset based on keywords
 * @param query Search query
 * @returns True if the query likely refers to a dataset
 */
function isDatasetQuery(query: string): boolean {
  const datasetKeywords = ['dataset', 'data', 'catalogue', 'catalog', 'file', 'download', 'csv', 'excel', 'raw'];
  const lowerQuery = query.toLowerCase();
  return datasetKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Performs an intelligent search that automatically falls back to searching both datasets and dashboards
 * if the primary search returns no results
 * @param query Search query
 * @param prioritizeType Optional type to prioritize in results ('dataset' or 'dashboard')
 * @param limit Maximum number of results to return
 * @returns Search results with fallback if needed
 */
function intelligentSearch(query: string, prioritizeType?: 'dataset' | 'dashboard', limit: number = 10): {
  results: SearchResult[];
  usedFallback: boolean;
  fallbackType?: 'dataset' | 'dashboard';
  originalType?: 'dataset' | 'dashboard';
} {
  // First try with the prioritized type
  const initialResults = unifiedSearch(query, prioritizeType);
  
  // If we have enough results, return them
  if (initialResults.length >= 3 || !prioritizeType) {
    return {
      results: initialResults.slice(0, limit),
      usedFallback: false,
      originalType: prioritizeType
    };
  }
  
  // If we have few results, try the opposite type as fallback
  const fallbackType = prioritizeType === 'dataset' ? 'dashboard' : 'dataset';
  const fallbackResults = unifiedSearch(query, fallbackType);
  
  // If fallback has results, return combined results with fallback first
  if (fallbackResults.length > 0) {
    const combinedResults = [...fallbackResults, ...initialResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
    return {
      results: combinedResults,
      usedFallback: true,
      fallbackType,
      originalType: prioritizeType
    };
  }
  
  // If neither search yielded good results, return the initial results
  return {
    results: initialResults.slice(0, limit),
    usedFallback: false,
    originalType: prioritizeType
  };
}

export function registerUnifiedSearchTools(server: McpServer) {
  // Unified search across datasets and dashboards
  server.tool(
    'search_all',
    '⭐⭐⭐ PRIMARY SEARCH TOOL: Always use this first for any data or visualization queries. Searches across both datasets and dashboards with intelligent fallback. ⭐⭐⭐',
    {
      query: z.string().describe('Search query to match against all content'),
      limit: z.number().min(1).max(20).optional().describe('Number of results to return (1-20)'),
      prioritize: z.enum(['dataset', 'dashboard']).optional().describe('Type of content to prioritize in results'),
    },
    async ({ query, limit = 10, prioritize }) => {
      try {
        // Determine if query suggests a specific content type
        let prioritizeType = prioritize;
        if (!prioritizeType) {
          if (isDashboardQuery(query)) {
            prioritizeType = 'dashboard';
          } else if (isDatasetQuery(query)) {
            prioritizeType = 'dataset';
          }
        }

        // Get intelligent search results with automatic fallback
        const { 
          results: searchResults, 
          usedFallback, 
          fallbackType,
          originalType 
        } = intelligentSearch(query, prioritizeType as 'dataset' | 'dashboard' | undefined, limit);
        
        // Group results by type for better presentation
        const groupedResults = {
          datasets: searchResults.filter(r => r.type === 'dataset'),
          dashboards: searchResults.filter(r => r.type === 'dashboard')
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Unified search results',
                query,
                total_matches: searchResults.length,
                showing: searchResults.length,
                prioritized_type: originalType || 'none',
                used_fallback: usedFallback,
                fallback_type: fallbackType,
                search_note: usedFallback ? 
                  `Limited results found in ${originalType} search, automatically included relevant ${fallbackType} results` : 
                  undefined,
                results: searchResults,
                grouped_results: groupedResults,
                data_access_notes: {
                  dashboards: 'Dashboard data is visualized on the web interface. Raw data files (e.g., parquet) cannot be directly accessed through this API.',
                  datasets: 'Dataset metadata is available through this API. For downloading the actual data files, please visit the dataset page on the data portal.',
                },
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
                error: 'Failed to perform unified search',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );
}
