/**
 * Shared search utilities used across datacatalogue, dashboards, and unified-search tools.
 */

// Words that appear in almost every title/description. Because matching is by
// substring, keeping them would make nearly every dataset "match" (e.g. "in",
// "by", "of"), so they are ignored when building search terms.
const STOP_WORDS = new Set([
  // English
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'with',
  // Malay
  'bagi', 'dan', 'dari', 'di', 'ke', 'mengikut', 'oleh', 'pada', 'untuk', 'yang',
]);

/**
 * Lower-case a metadata field so it can be matched against search terms.
 *
 * Upstream metadata is not guaranteed to have every field, or to have it as a
 * string, so anything that isn't a string becomes ''. This is what keeps one
 * incomplete catalogue entry from crashing every search with
 * "Cannot read properties of undefined (reading 'toLowerCase')".
 */
export function searchableText(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

// Split a query into lower-case search terms, dropping stop words and 1-letter tokens
export function tokenizeQuery(query: string): string[] {
  return searchableText(query)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 1 && !STOP_WORDS.has(term));
}

// Helper function to normalize terms by removing common prefixes and handling variations
export function normalizeTerm(term: string): string[] {
  const normalized = term.replace(/-/g, '').trim();

  // Treat a leading "e" as optional for e-words ("epayment" -> "payment",
  // "ewallet" -> "wallet"). Only when enough is left to stay specific:
  // "eat" -> "at" would match almost every title.
  if (normalized.startsWith('e') && normalized.length > 4) {
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

  // Singular/plural variant. Short words (bus, gas, gdp) are left alone,
  // because dropping a letter from them would match far too much.
  if (normalizedTerm.length > 3) {
    if (normalizedTerm.endsWith('s')) {
      expanded.push(normalizedTerm.slice(0, -1));
    } else {
      expanded.push(normalizedTerm + 's');
    }
  }

  return [...new Set(expanded)];
}

/** A query prepared for matching: the whole phrase, plus one group of variants per word. */
export interface SearchTerms {
  phrase: string;
  groups: string[][];
}

export function buildSearchTerms(query: string): SearchTerms {
  return {
    phrase: searchableText(query).trim(),
    groups: tokenizeQuery(query).map(term => expandSearchTerms(term)),
  };
}

/** The lower-cased text of one search result, split by how much a match there should count. */
export interface SearchableFields {
  primary: string;   // titles / names
  id: string;        // identifiers and routes
  secondary: string; // descriptions
}

/**
 * Score how well one item matches a query; 0 means "no match".
 *
 * - The whole query appearing verbatim: +10 in a title or id, +5 in a description.
 * - Each query word (any of its variants): +3 in a title, +2 in an id, +1 in a description.
 *
 * Each word counts once per field however many of its variants matched, so items
 * that match more of the query's words rank higher.
 */
export function scoreMatch(fields: SearchableFields, terms: SearchTerms): number {
  let score = 0;

  if (terms.phrase) {
    if (fields.primary.includes(terms.phrase) || fields.id.includes(terms.phrase)) score += 10;
    if (fields.secondary.includes(terms.phrase)) score += 5;
  }

  for (const variants of terms.groups) {
    if (variants.some(v => fields.primary.includes(v))) score += 3;
    if (variants.some(v => fields.id.includes(v))) score += 2;
    if (variants.some(v => fields.secondary.includes(v))) score += 1;
  }

  return score;
}
