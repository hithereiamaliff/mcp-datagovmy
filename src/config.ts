/**
 * Centralized configuration for the Malaysia Open Data MCP Server.
 * All API endpoints, cache TTLs, and external URLs should be defined here.
 */

export const API_BASE_URL = process.env.API_BASE_URL || 'https://api.data.gov.my';

export const GITHUB_RAW_BASE_URL = process.env.GITHUB_DATA_CATALOGUE_URL ||
  'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue';

export const GITHUB_DASHBOARDS_URL = process.env.GITHUB_DASHBOARDS_URL ||
  'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/dashboards';

export const GITHUB_API_BASE_URL = process.env.GITHUB_API_BASE_URL ||
  'https://api.github.com/repos/data-gov-my/datagovmy-meta';

export const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN || '';

const DEFAULT_GITHUB_FETCH_BATCH_SIZE = 20;
const parsedGithubFetchBatchSize = Number.parseInt(
  process.env.GITHUB_FETCH_BATCH_SIZE || '',
  10
);
export const GITHUB_FETCH_BATCH_SIZE =
  Number.isFinite(parsedGithubFetchBatchSize) && parsedGithubFetchBatchSize > 0
    ? parsedGithubFetchBatchSize
    : DEFAULT_GITHUB_FETCH_BATCH_SIZE;

export const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600000', 10); // 1 hour default

export const AXIOS_TIMEOUT = parseInt(process.env.AXIOS_TIMEOUT || '30000', 10); // 30 seconds default

// Set global axios defaults so all tool files get timeout automatically
import axios from 'axios';
axios.defaults.timeout = AXIOS_TIMEOUT;
