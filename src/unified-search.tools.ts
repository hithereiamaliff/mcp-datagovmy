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
// Helper function to tokenize a query into individual terms
function tokenizeQuery(query: string): string[] {
  // Remove special characters and split by spaces
  return query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 0);
}

// Helper function to normalize terms by removing common prefixes and handling variations
function normalizeTerm(term: string): string[] {
  // Remove hyphens and normalize spacing
  let normalized = term.replace(/-/g, '').trim();
  
  // Handle common prefixes/variations
  if (normalized.startsWith('e') && normalized.length > 1) {
    // e.g., 'epayment' -> also try 'payment'
    return [normalized, normalized.substring(1)];
  }
  
  return [normalized];
}

// A small set of common synonyms for frequently used terms
const COMMON_SYNONYMS: Record<string, string[]> = {
  'payment': ['payment', 'pay', 'transaction'],
  'electronic': ['electronic', 'digital', 'online', 'cashless'],
  'statistics': ['statistics', 'stats', 'data', 'figures', 'numbers'],
  'dashboard': ['dashboard', 'visualization', 'chart', 'graph'],
  'dataset': ['dataset', 'data set', 'database', 'data'],
};

// Helper function to expand search terms for better matching
function expandSearchTerms(term: string): string[] {
  const normalizedTerm = term.toLowerCase().trim();
  
  // Start with the original term
  let expanded = [normalizedTerm];
  
  // Add normalized variations
  expanded = expanded.concat(normalizeTerm(normalizedTerm));
  
  // Check for common synonyms
  for (const [key, synonyms] of Object.entries(COMMON_SYNONYMS)) {
    if (normalizedTerm === key || synonyms.includes(normalizedTerm)) {
      expanded = expanded.concat(synonyms);
      break;
    }
  }
  
  // Basic stemming for plurals
  if (normalizedTerm.endsWith('s')) {
    expanded.push(normalizedTerm.slice(0, -1)); // Remove trailing 's'
  } else {
    expanded.push(normalizedTerm + 's'); // Add trailing 's'
  }
  
  // Remove duplicates and return
  return [...new Set(expanded)];
}

function unifiedSearch(query: string, prioritizeType?: 'dataset' | 'dashboard'): SearchResult[] {
  // Tokenize the query into individual terms
  const queryTerms = tokenizeQuery(query);
  
  // Expand each term with better matching
  const expandedTerms = queryTerms.flatMap(term => expandSearchTerms(term));
  
  // Search in datasets with improved scoring
  const datasetResults = searchDatasets(query).map((dataset: DatasetMetadata) => {
    const title = dataset.title_en.toLowerCase();
    const id = dataset.id.toLowerCase();
    const description = dataset.description_en.toLowerCase();
    
    // Calculate score based on term matches
    let score = 0;
    
    // Check for exact query match (highest priority)
    if (title.includes(query.toLowerCase())) score += 10;
    if (description.includes(query.toLowerCase())) score += 5;
    
    // Check for individual term matches
    expandedTerms.forEach(term => {
      if (title.includes(term)) score += 3;
      if (id.includes(term)) score += 2;
      if (description.includes(term)) score += 1;
    });
    
    return {
      type: 'dataset' as const,
      id: dataset.id,
      title: dataset.title_en,
      description: dataset.description_en,
      url: `https://data.gov.my/data-catalogue/${dataset.id}`,
      score
    };
  });

  // Search in dashboards with improved scoring
  const dashboardResults = searchDashboards(query).map((dashboard: DashboardMetadata) => {
    const name = dashboard.dashboard_name.toLowerCase();
    const route = (dashboard.route || '').toLowerCase();
    
    // Calculate score based on term matches
    let score = 0;
    
    // Check for exact query match (highest priority)
    if (name.includes(query.toLowerCase())) score += 10;
    if (route.includes(query.toLowerCase())) score += 5;
    
    // Check for individual term matches
    expandedTerms.forEach(term => {
      if (name.includes(term)) score += 3;
      if (route.includes(term)) score += 2;
    });
    
    return {
      type: 'dashboard' as const,
      id: dashboard.dashboard_name,
      title: dashboard.dashboard_name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: dashboard.route || '',
      url: dashboard.route ? 
        (dashboard.sites?.includes('opendosm') ? `https://open.dosm.gov.my${dashboard.route}` : `https://data.gov.my${dashboard.route}`) 
        : `/dashboard/${dashboard.dashboard_name}`,
      score
    };
  });

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
          
          // Special case for domain-specific queries
          const lowerQuery = query.toLowerCase();
          
          // Payment-related terms are more likely to be found in dashboards
          if (lowerQuery.includes('payment') || 
              lowerQuery.includes('pay') || 
              lowerQuery.includes('transaction') || 
              lowerQuery.includes('electronic') || 
              lowerQuery.includes('digital')) {
            prioritizeType = 'dashboard';
          }
          
          // Statistics-related terms are more likely to be found in dashboards
          if (lowerQuery.includes('statistics') || 
              lowerQuery.includes('stats') || 
              lowerQuery.includes('chart') || 
              lowerQuery.includes('graph')) {
            prioritizeType = 'dashboard';
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
