/**
 * Shared search utilities used across datacatalogue, dashboards, and unified-search tools.
 */

// Helper function to tokenize a query into individual terms
export function tokenizeQuery(query: string): string[] {
  return query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 0);
}

// Helper function to normalize terms by removing common prefixes and handling variations
export function normalizeTerm(term: string): string[] {
  let normalized = term.replace(/-/g, '').trim();

  if (normalized.startsWith('e') && normalized.length > 1) {
    return [normalized, normalized.substring(1)];
  }

  return [normalized];
}

// A small set of common synonyms for frequently used terms
export const COMMON_SYNONYMS: Record<string, string[]> = {
  'payment': ['payment', 'pay', 'transaction'],
  'electronic': ['electronic', 'digital', 'online', 'cashless'],
  'statistics': ['statistics', 'stats', 'data', 'figures', 'numbers'],
  'dashboard': ['dashboard', 'visualization', 'chart', 'graph'],
  'dataset': ['dataset', 'data set', 'database', 'data'],
};

// Helper function to expand search terms for better matching
export function expandSearchTerms(term: string): string[] {
  const normalizedTerm = term.toLowerCase().trim();

  let expanded = [normalizedTerm];

  expanded = expanded.concat(normalizeTerm(normalizedTerm));

  for (const [key, synonyms] of Object.entries(COMMON_SYNONYMS)) {
    if (normalizedTerm === key || synonyms.includes(normalizedTerm)) {
      expanded = expanded.concat(synonyms);
      break;
    }
  }

  if (normalizedTerm.endsWith('s')) {
    expanded.push(normalizedTerm.slice(0, -1));
  } else {
    expanded.push(normalizedTerm + 's');
  }

  return [...new Set(expanded)];
}
