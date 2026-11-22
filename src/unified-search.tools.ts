import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Import search functions and types from both modules
import { getAllDatasets, rankDatasets, DatasetMetadata } from './datacatalogue.tools.js';
import { getAllDashboards, rankDashboards, dashboardUrl, primaryRoute, DashboardMetadata } from './dashboards.tools.js';
import { prefixToolName } from './utils/tool-naming.js';

// Define result interfaces
export interface SearchResult {
  type: 'dataset' | 'dashboard';
  id: string;
  title: string;
  description?: string;
  url?: string;
  score: number;
}

/**
 * Rank datasets and dashboards together. Pure function (no network) so it can be
 * tested; scores come from the same scoring the dataset/dashboard search tools use.
 */
export function buildUnifiedResults(
  query: string,
  datasets: DatasetMetadata[],
  dashboards: DashboardMetadata[],
  prioritizeType?: 'dataset' | 'dashboard'
): SearchResult[] {
  const datasetResults = rankDatasets(query, datasets).map(({ dataset, score }) => ({
    type: 'dataset' as const,
    id: dataset.id,
    title: dataset.title_en,
    description: dataset.description_en,
    url: `https://data.gov.my/data-catalogue/${dataset.id}`,
    score
  }));

  const dashboardResults = rankDashboards(query, dashboards).map(({ dashboard, score }) => {
    const name = dashboard.dashboard_name || '';
    return {
      type: 'dashboard' as const,
      id: name,
      title: name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: primaryRoute(dashboard.route) || '',
      url: dashboardUrl(dashboard),
      score
    };
  });

  // Combine results
  let combinedResults: SearchResult[] = [...datasetResults, ...dashboardResults];

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

async function unifiedSearch(query: string, prioritizeType?: 'dataset' | 'dashboard'): Promise<SearchResult[]> {
  const [datasets, dashboards] = await Promise.all([getAllDatasets(), getAllDashboards()]);
  return buildUnifiedResults(query, datasets, dashboards, prioritizeType);
}

/**
 * Check if a query might be referring to a dashboard based on keywords
 */
function isDashboardQuery(query: string): boolean {
  const dashboardKeywords = ['dashboard', 'chart', 'graph', 'visualization', 'visualisation', 'stats', 'statistics'];
  const lowerQuery = query.toLowerCase();
  return dashboardKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Check if a query might be referring to a dataset based on keywords
 */
function isDatasetQuery(query: string): boolean {
  const datasetKeywords = ['dataset', 'data', 'catalogue', 'catalog', 'file', 'download', 'csv', 'excel', 'raw'];
  const lowerQuery = query.toLowerCase();
  return datasetKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Searches datasets and dashboards together. When a type is prioritized but has
 * fewer than 3 hits, the other type's hits fill the list ("fallback").
 *
 * Each item appears once. (The old version re-ran the same search with the other
 * boost and merged both lists, so every result showed up twice.)
 */
async function intelligentSearch(query: string, prioritizeType?: 'dataset' | 'dashboard', limit: number = 10): Promise<{
  results: SearchResult[];
  totalMatches: number;
  usedFallback: boolean;
  fallbackType?: 'dataset' | 'dashboard';
  originalType?: 'dataset' | 'dashboard';
}> {
  const allResults = await unifiedSearch(query, prioritizeType);

  const fallbackType = prioritizeType === 'dataset' ? 'dashboard' : 'dataset';
  const prioritizedCount = allResults.filter(r => r.type === prioritizeType).length;
  const usedFallback = Boolean(prioritizeType) && prioritizedCount < 3 &&
    allResults.some(r => r.type === fallbackType);

  return {
    results: allResults.slice(0, limit),
    totalMatches: allResults.length,
    usedFallback,
    fallbackType: usedFallback ? fallbackType : undefined,
    originalType: prioritizeType
  };
}

export function registerUnifiedSearchTools(server: McpServer) {
  // Unified search across datasets and dashboards
  server.tool(
    prefixToolName('search_all'),
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
          totalMatches,
          usedFallback,
          fallbackType,
          originalType
        } = await intelligentSearch(query, prioritizeType as 'dataset' | 'dashboard' | undefined, limit);

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
                total_matches: totalMatches,
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
