/**
 * Helpers for calling the data.gov.my REST API (https://api.data.gov.my).
 */
import axios from 'axios';

// Upper bound on rows fetched for one call, so a large offset can't pull a huge response
export const MAX_API_ROWS = 10_000;

/**
 * Fetch rows from a data.gov.my API endpoint with working `offset` support.
 *
 * The API supports `limit` but silently ignores `offset` (offset=2 returns the
 * same rows as offset=0), so this fetches `offset + limit` rows and drops the
 * first `offset`. Works whether the API answers with a plain array or with
 * { meta, data } (when meta=true).
 */
export async function fetchApiRows(
  url: string,
  params: Record<string, unknown>,
  limit: number,
  offset: number
): Promise<unknown[]> {
  if (offset + limit > MAX_API_ROWS) {
    throw new Error(
      `offset + limit can be at most ${MAX_API_ROWS}. For bigger downloads use the dataset's ` +
      'CSV/Parquet link (see get_dataset_details) or parse_parquet_file.'
    );
  }

  const response = await axios.get(url, { params: { ...params, limit: offset + limit } });
  const body = response.data as unknown;
  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown })?.data)
      ? (body as { data: unknown[] }).data
      : null;

  if (!rows) {
    throw new Error('Unexpected response format from the data.gov.my API');
  }
  return rows.slice(offset);
}

/**
 * Turn an error into text that includes the API's own explanation, e.g.
 * "Request failed with status code 400: Query parameter 'id' is required."
 * (axios's message alone is just the status code).
 */
export function describeApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const details = (error.response?.data as { details?: unknown } | undefined)?.details;
    const detailText = Array.isArray(details) ? details.join(' ') : typeof details === 'string' ? details : '';
    return detailText ? `${error.message}: ${detailText}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Today's date in Malaysia (UTC+8) as YYYY-MM-DD. The server itself runs in UTC. */
export function todayInMalaysia(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Government feeds use Malay place names. Map common English names so that,
// for example, "Penang" finds "PULAU PINANG" instead of returning nothing.
const MALAY_PLACE_NAMES: Record<string, string> = {
  penang: 'Pinang',
  'penang island': 'Pulau Pinang',
  malacca: 'Melaka',
  johore: 'Johor',
  kl: 'Kuala Lumpur',
};

/** Translate a common English place name to the Malay name used upstream (else unchanged). */
export function toMalayPlaceName(name: string): string {
  const trimmed = name.trim();
  return MALAY_PLACE_NAMES[trimmed.toLowerCase()] ?? trimmed;
}
