import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
// Import hyparquet with correct function names
import { parquetRead, parquetReadObjects, parquetMetadataAsync, parquetSchema, asyncBufferFromUrl } from 'hyparquet';
// Import compressors for BROTLI support
import { compressors } from 'hyparquet-compressors';
import { prefixToolName } from './utils/tool-naming.js';
import { AXIOS_TIMEOUT } from './config.js';
import { getDatasets, getDashboards, type DatasetMetadata, type DashboardMetadata } from './utils/github-index.js';
import { dashboardUrl, rankDashboards } from './dashboards.tools.js';

// ---------------------------------------------------------------------------
// Safety limits.
// WHY: parquet files are tightly compressed. A 2 MB file on data.gov.my can hold almost
// 2 million rows, and unpacking all of them into JavaScript objects took over 1 GB of memory
// in testing, enough to crash a small server for every user. These limits keep each call bounded.
// ---------------------------------------------------------------------------

/** Most cells (rows x columns) we unpack in one go. Roughly 100-150 MB of memory at worst. */
const FULL_READ_CELL_LIMIT = 2_000_000;
/** Most rows we scan when reading only the one or two columns a filter or "latest" needs. */
const NARROW_SCAN_ROW_LIMIT = 2_000_000;

/**
 * Custom parsers for hyparquet to decode date/timestamp parquet types into
 * ISO strings instead of returning empty objects.
 */
const parquetParsers = {
  dateFromDays(days: number) {
    return new Date(days * 86400000).toISOString().split('T')[0];
  },
  timestampFromMilliseconds(millis: bigint) {
    return new Date(Number(millis)).toISOString();
  },
  timestampFromMicroseconds(micros: bigint) {
    return new Date(Number(micros / 1000n)).toISOString();
  },
  timestampFromNanoseconds(nanos: bigint) {
    return new Date(Number(nanos / 1000000n)).toISOString();
  },
};

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

type DateGranularity = 'yearly' | 'monthly' | 'daily';

interface StrictParsedDate {
  date: Date;
  granularity: DateGranularity;
}

function parseDateNumberPart(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value);
  }

  return null;
}

function createUtcDate(year: number, month: number = 1, day: number = 1): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatDateForGranularity(date: Date, granularity: DateGranularity): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  if (granularity === 'yearly') {
    return `${year}`;
  }

  if (granularity === 'monthly') {
    return `${year}-${month}`;
  }

  return `${year}-${month}-${day}`;
}

function strictParseDateDetails(value: any): StrictParsedDate | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : { date: value, granularity: 'daily' };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }

    let match = /^(\d{4})$/.exec(trimmed);
    if (match) {
      const parsed = createUtcDate(Number(match[1]));
      return parsed ? { date: parsed, granularity: 'yearly' } : null;
    }

    match = /^(\d{4})-(\d{2})$/.exec(trimmed);
    if (match) {
      const parsed = createUtcDate(Number(match[1]), Number(match[2]));
      return parsed ? { date: parsed, granularity: 'monthly' } : null;
    }

    match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (match) {
      const parsed = createUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
      return parsed ? { date: parsed, granularity: 'daily' } : null;
    }

    match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(trimmed);
    if (match) {
      const parsed = createUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
      return parsed ? { date: parsed, granularity: 'daily' } : null;
    }

    match = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2})(?::(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/.exec(trimmed);
    if (match && !/[zZ]$/.test(trimmed) && !/[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const parsed = createUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
      return parsed ? { date: parsed, granularity: 'daily' } : null;
    }

    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed) || /[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? null : { date: parsed, granularity: 'daily' };
    }

    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : { date: parsed, granularity: 'daily' };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return null;
    }

    const year = parseDateNumberPart(value.year);
    if (year === null) {
      return null;
    }

    const month = parseDateNumberPart(value.month);
    if (month === null) {
      const parsed = createUtcDate(year);
      return parsed ? { date: parsed, granularity: 'yearly' } : null;
    }

    if (value.day === undefined || value.day === null) {
      const parsed = createUtcDate(year, month);
      return parsed ? { date: parsed, granularity: 'monthly' } : null;
    }

    const day = parseDateNumberPart(value.day);
    if (day === null) {
      return null;
    }

    const parsed = createUtcDate(year, month, day);
    return parsed ? { date: parsed, granularity: 'daily' } : null;
  }

  return null;
}

/**
 * Strictly parse a value into a Date without fabricating dates.
 * Returns null for any value that cannot be genuinely parsed.
 * It never falls back to "current date" -- it only returns real parsed values.
 * @param value The value to attempt parsing
 * @returns A valid Date or null
 */
function strictParseDate(value: any): Date | null {
  return strictParseDateDetails(value)?.date ?? null;
}

/**
 * Classify a column's semantic type based on its name, schema type, and sample values.
 * @param columnName The column name
 * @param schemaType The inferred JS typeof from the schema
 * @param sampleValues A sample of non-null values from the column
 * @returns The classified type
 */
function classifyColumnType(
  columnName: string,
  schemaType: string,
  sampleValues: any[]
): 'numeric' | 'string' | 'date' | 'boolean' | 'other' {
  // Check column name for date heuristics first
  const lowerName = columnName.toLowerCase();
  if (lowerName === 'date' || lowerName === 'dt' || lowerName === 'timestamp' || lowerName.includes('date')) {
    return 'date';
  }

  // Check schema type
  if (schemaType === 'number' || schemaType === 'bigint') return 'numeric';
  if (schemaType === 'boolean') return 'boolean';

  // Sample-based classification
  const nonNull = sampleValues.filter(v => v !== null && v !== undefined);
  if (nonNull.length === 0) return 'other';

  // Take up to 20 samples
  const samples = nonNull.slice(0, 20);

    // Check if all are numbers (or numeric strings from BigInt conversion)
    if (samples.every(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== ''))) {
    // Could be numeric strings from BigInt conversion - check if schema said bigint
      if (schemaType === 'bigint' || samples.every(v => typeof v === 'number')) {
        return 'numeric';
      }
  }

  if (samples.every(v => typeof v === 'boolean')) return 'boolean';

  // Check if values look like date strings
  if (samples.every(v => typeof v === 'string' && strictParseDate(v) !== null)) {
    return 'date';
  }

  if (samples.every(v => typeof v === 'string')) return 'string';

  return 'other';
}

/**
 * Parse date values with a small cache.
 * WHY: big files repeat the same few dates millions of times (e.g. one date per day in a
 * monthly price file), so caching makes scanning them fast.
 */
function createDateParser(): (value: unknown) => StrictParsedDate | null {
  const cache = new Map<string, StrictParsedDate | null>();
  return (value: unknown) => {
    if (typeof value !== 'string') return strictParseDateDetails(value);
    let parsed = cache.get(value);
    if (parsed === undefined) {
      parsed = strictParseDateDetails(value);
      if (cache.size < 100_000) cache.set(value, parsed);
    }
    return parsed;
  };
}

/**
 * Tracks the latest date seen and how precise the dates are (yearly / monthly / daily).
 * WHY: this replaces Math.max(...allDates), which crashes with "Maximum call stack size
 * exceeded" once a file has more than about 120,000 rows.
 */
function createLatestDateTracker() {
  let latest: StrictParsedDate | null = null;
  let allYearly = true;
  let allYearlyOrMonthly = true;
  let allJan1 = true;
  let allFirstOfMonth = true;
  return {
    add(parsed: StrictParsedDate) {
      if (!latest || parsed.date > latest.date) latest = parsed;
      if (parsed.granularity !== 'yearly') allYearly = false;
      if (parsed.granularity === 'daily') allYearlyOrMonthly = false;
      if (parsed.date.getUTCDate() !== 1) {
        allFirstOfMonth = false;
        allJan1 = false;
      } else if (parsed.date.getUTCMonth() !== 0) {
        allJan1 = false;
      }
    },
    /** Latest date plus the granularity that fits ALL dates seen, or null if none were added. */
    result(): { date: Date; granularity: DateGranularity } | null {
      const found = latest as StrictParsedDate | null;
      if (!found) return null;
      const granularity: DateGranularity = allYearly ? 'yearly'
        : allYearlyOrMonthly ? 'monthly'
        : allJan1 ? 'yearly'          // e.g. 2020-01-01, 2021-01-01 ... stored as full dates
        : allFirstOfMonth ? 'monthly' // e.g. 2024-01-01, 2024-02-01 ...
        : 'daily';
      return { date: found.date, granularity };
    },
  };
}

/**
 * Last moment that still belongs to a period: "2025" -> 31 Dec 2025 23:59:59.999,
 * "2025-06" -> 30 Jun 2025 23:59:59.999, "2025-06-30" -> that day at 23:59:59.999.
 * WHY: the old "to" filter always added just one day, so filter_date_to "2025" meant 1 Jan 2025.
 */
function endOfPeriod({ date, granularity }: StrictParsedDate): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const nextPeriodStart = granularity === 'yearly'
    ? Date.UTC(year + 1, 0, 1)
    : granularity === 'monthly'
      ? Date.UTC(year, month + 1, 1)
      : Date.UTC(year, month, day + 1);
  return new Date(nextPeriodStart - 1);
}

// ============================================================
// Summary mode types and functions
// ============================================================

interface ColumnSummaryBase {
  name: string;
  type: 'numeric' | 'string' | 'date' | 'boolean' | 'other';
  nonNullCount: number;
  nullCount: number;
}

interface NumericColumnSummary extends ColumnSummaryBase {
  type: 'numeric';
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
}

interface StringColumnSummary extends ColumnSummaryBase {
  type: 'string';
  uniqueCount: number;
  topValues: Array<{ value: string; count: number }>;
}

interface DateColumnSummary extends ColumnSummaryBase {
  type: 'date';
  earliest: string | null;
  latest: string | null;
  spanDays: number | null;
}

interface BooleanColumnSummary extends ColumnSummaryBase {
  type: 'boolean';
  trueCount: number;
  falseCount: number;
}

interface OtherColumnSummary extends ColumnSummaryBase {
  type: 'other';
}

type ColumnSummary = NumericColumnSummary | StringColumnSummary | DateColumnSummary | BooleanColumnSummary | OtherColumnSummary;

interface GroupedAggregation {
  groupedBy: string;
  groups: Array<{
    key: string;
    count: number;
    aggregations: Record<string, { sum: number; mean: number; min: number; max: number }>;
  }>;
  truncated?: boolean;
  totalGroups?: number;
}

interface RawParquetContext {
  file: Awaited<ReturnType<typeof asyncBufferFromUrl>>;
  metadata: Awaited<ReturnType<typeof parquetMetadataAsync>>;
}

function detectDateColumnFromSchema(schema: Record<string, string>): string | null {
  const columns = Object.keys(schema);
  for (const column of columns) {
    const lowerColumn = column.toLowerCase();
    if (
      lowerColumn === 'date' ||
      lowerColumn.includes('date') ||
      lowerColumn === 'dt' ||
      lowerColumn === 'timestamp'
    ) {
      return column;
    }
  }

  return null;
}

function inferSchemaFromRawRows(rows: Record<string, any>[]): Record<string, string> {
  if (!rows || rows.length === 0) {
    return {};
  }

  const columns = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach(key => columns.add(key));
  }

  const schema: Record<string, string> = {};
  for (const column of columns) {
    let inferredType = 'unknown';
    for (const row of rows) {
      const value = row[column];
      if (value === null || value === undefined) {
        continue;
      }

      inferredType = typeof value === 'bigint' ? 'bigint' : typeof value;
      break;
    }

    schema[column] = inferredType;
  }

  return schema;
}

/**
 * fetch() with a time limit on every request hyparquet makes.
 * WHY: hyparquet uses the built-in fetch, which ignores the axios timeout set in config.ts,
 * so a stalled storage server could otherwise keep a tool call hanging for minutes.
 */
const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(AXIOS_TIMEOUT) });

async function getRawParquetContext(url: string): Promise<RawParquetContext> {
  const file = await asyncBufferFromUrl({ url, fetch: fetchWithTimeout });
  const metadata = await parquetMetadataAsync(file);
  return { file, metadata };
}

async function readRawParquetRows(
  url: string,
  options: {
    rowStart?: number;
    rowEnd?: number;
    columns?: string[];
    context?: RawParquetContext;
  } = {}
): Promise<{
  data: Record<string, any>[];
  schema: Record<string, string>;
  totalRows: number;
  context: RawParquetContext;
}> {
  const context = options.context ?? await getRawParquetContext(url);
  const rows = await parquetReadObjects({
    file: context.file,
    metadata: context.metadata,
    rowStart: options.rowStart ?? 0,
    rowEnd: options.rowEnd,
    columns: options.columns,
    compressors,
    parsers: parquetParsers,
  });

  return {
    data: processBigIntValues(rows),
    schema: inferSchemaFromRawRows(rows),
    totalRows: Number(context.metadata.num_rows),
    context,
  };
}

/**
 * Column name -> simple type ("string", "integer", "number", "date", "timestamp", ...),
 * read from the file footer, so no row data has to be downloaded.
 */
function columnTypesFromMetadata(metadata: RawParquetContext['metadata']): Record<string, string> {
  const types: Record<string, string> = {};
  for (const column of parquetSchema(metadata).children) {
    const { name, type, converted_type: converted, logical_type: logical } = column.element;
    if (column.children.length > 0) types[name] = 'nested';
    else if (logical?.type === 'DATE' || converted === 'DATE') types[name] = 'date';
    else if (logical?.type === 'TIMESTAMP' || converted === 'TIMESTAMP_MILLIS' || converted === 'TIMESTAMP_MICROS' || type === 'INT96') types[name] = 'timestamp';
    else if (logical?.type === 'DECIMAL' || converted === 'DECIMAL') types[name] = 'decimal';
    else if (type === 'BYTE_ARRAY' || type === 'FIXED_LEN_BYTE_ARRAY') types[name] = 'string';
    else if (type === 'INT32' || type === 'INT64') types[name] = 'integer';
    else if (type === 'FLOAT' || type === 'DOUBLE') types[name] = 'number';
    else if (type === 'BOOLEAN') types[name] = 'boolean';
    else types[name] = 'unknown';
  }
  return types;
}

/** Pick the date column: prefer a real date/timestamp column, otherwise fall back to the name check. */
function detectDateColumnFromTypes(types: Record<string, string>): string | null {
  return Object.keys(types).find(column => types[column] === 'date' || types[column] === 'timestamp')
    ?? detectDateColumnFromSchema(types);
}

/**
 * Read every value of a few columns as plain arrays, without building row objects.
 * WHY: deciding which rows match a filter only needs one or two columns, and keeping just
 * those as arrays uses a small fraction of the memory of loading whole rows.
 */
async function readColumnArrays(context: RawParquetContext, columns: string[]): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  for (const column of columns) result[column] = [];
  await parquetRead({
    file: context.file,
    metadata: context.metadata,
    columns,
    compressors,
    parsers: parquetParsers,
    onChunk: ({ columnName, columnData, rowStart }) => {
      const target = result[columnName];
      if (!target) return;
      for (let i = 0; i < columnData.length; i++) target[rowStart + i] = columnData[i];
    },
  });
  return result;
}

/**
 * Load full rows for specific row numbers by reading one continuous block that covers them.
 * The block is capped (FULL_READ_CELL_LIMIT) so widely scattered matches can never unpack a
 * huge file; when that happens we return fewer rows and report capped: true.
 * Returns raw rows (BigInt not yet converted) so callers can still see the original types.
 */
async function readRowsAt(
  context: RawParquetContext,
  indexes: number[],
  columns: string[] | undefined,
  keepLast = false
): Promise<{ rows: Record<string, any>[]; capped: boolean }> {
  if (indexes.length === 0) return { rows: [], capped: false };
  const columnCount = columns?.length || parquetSchema(context.metadata).children.length || 1;
  const maxSpan = Math.max(1, Math.floor(FULL_READ_CELL_LIMIT / columnCount));
  let picked = indexes;
  if (keepLast) {
    const last = picked[picked.length - 1];
    let start = 0;
    while (last - picked[start] >= maxSpan) start++;
    picked = picked.slice(start);
  } else {
    const first = picked[0];
    let end = picked.length;
    while (picked[end - 1] - first >= maxSpan) end--;
    picked = picked.slice(0, end);
  }
  const rowStart = picked[0];
  const block = await parquetReadObjects({
    file: context.file,
    metadata: context.metadata,
    rowStart,
    rowEnd: picked[picked.length - 1] + 1,
    columns,
    compressors,
    parsers: parquetParsers,
  });
  return { rows: picked.map(i => block[i - rowStart]), capped: picked.length < indexes.length };
}

type FilterOptions = {
  filter_date_from?: string;
  filter_date_to?: string;
  filter_column?: string;
  filter_value?: string;
};

/** The user's filters, checked and parsed once, plus a description to show back to them. */
interface PreparedFilters {
  dateColumn: string | null; // set only when a date filter is active
  from: Date | null;
  toEnd: Date | null;
  column: string | null; // set only when a column filter is active
  value: string;
  neededColumns: string[]; // the columns the filters have to read
  appliedFilters: Record<string, any>;
  error?: string; // set when the user's input can't be understood
}

function prepareFilters(columnNames: string[], dateColumn: string | null, options: FilterOptions): PreparedFilters {
  const prepared: PreparedFilters = {
    dateColumn: null, from: null, toEnd: null, column: null, value: '', neededColumns: [], appliedFilters: {},
  };

  if (options.filter_date_from || options.filter_date_to) {
    if (!dateColumn) {
      prepared.appliedFilters.date_range = {
        warning: 'No date column detected. Date filter was not applied.',
        from: options.filter_date_from || null,
        to: options.filter_date_to || null,
      };
    } else {
      const from = options.filter_date_from ? strictParseDateDetails(options.filter_date_from) : null;
      const to = options.filter_date_to ? strictParseDateDetails(options.filter_date_to) : null;
      // WHY: an unreadable date used to be silently ignored while still being reported as applied.
      if ((options.filter_date_from && !from) || (options.filter_date_to && !to)) {
        prepared.error = `Could not understand the date filter (from: ${options.filter_date_from ?? '-'}, to: ${options.filter_date_to ?? '-'}). Use YYYY, YYYY-MM or YYYY-MM-DD, for example "2024", "2024-06" or "2024-06-30".`;
        return prepared;
      }
      prepared.dateColumn = dateColumn;
      prepared.from = from?.date ?? null;
      prepared.toEnd = to ? endOfPeriod(to) : null;
      prepared.neededColumns.push(dateColumn);
      prepared.appliedFilters.date_range = {
        column: dateColumn,
        from: options.filter_date_from || null,
        to: options.filter_date_to || null,
      };
    }
  }

  if (options.filter_column && options.filter_value !== undefined) {
    if (columnNames.includes(options.filter_column)) {
      prepared.column = options.filter_column;
      prepared.value = options.filter_value;
      if (!prepared.neededColumns.includes(options.filter_column)) prepared.neededColumns.push(options.filter_column);
      prepared.appliedFilters.column_filter = { column: options.filter_column, value: options.filter_value };
    } else {
      prepared.appliedFilters.column_filter = {
        warning: `Column '${options.filter_column}' not found.`,
        availableColumns: columnNames,
      };
    }
  }

  return prepared;
}

/**
 * Apply prepared filters to rowCount rows, reading values through get(column, rowNumber).
 * Returns the matching row numbers and records before/after counts for the user.
 */
function runFilters(prepared: PreparedFilters, rowCount: number, get: (column: string, row: number) => any): number[] {
  const parseDate = createDateParser();
  const matches: number[] = [];
  let afterDateFilter = 0;
  for (let i = 0; i < rowCount; i++) {
    if (prepared.dateColumn) {
      const date = parseDate(get(prepared.dateColumn, i))?.date;
      if (!date || (prepared.from && date < prepared.from) || (prepared.toEnd && date > prepared.toEnd)) continue;
    }
    afterDateFilter++;
    if (prepared.column) {
      const value = get(prepared.column, i);
      if (value === null || value === undefined || String(value) !== prepared.value) continue;
    }
    matches.push(i);
  }
  if (prepared.dateColumn) Object.assign(prepared.appliedFilters.date_range, { rowsBefore: rowCount, rowsAfter: afterDateFilter });
  if (prepared.column) Object.assign(prepared.appliedFilters.column_filter, { rowsBefore: afterDateFilter, rowsAfter: matches.length });
  return matches;
}

function tooLargeMessage(totalRows: number): string {
  return `This file has ${totalRows.toLocaleString('en-US')} rows, more than this server can scan safely (limit ${NARROW_SCAN_ROW_LIMIT.toLocaleString('en-US')} rows). Use output_mode "raw" or "summary" without filters to preview the first rows, or view the full data on its data.gov.my / OpenDOSM page.`;
}

interface FilteredRows {
  data: Record<string, any>[]; // BigInt values already converted to strings
  schema: Record<string, string>; // JS types of the returned rows
  totalRows: number;
  matchedRows: number;
  appliedFilters: Record<string, any>;
  capped: boolean;
}

/**
 * Return up to maxRows rows that match the filters (the first matches, or the last ones).
 * Small files are unpacked once. Big files are handled in two steps: read only the columns
 * the filters need to find the matching row numbers, then load just those rows.
 */
async function readFilteredRows(
  context: RawParquetContext,
  options: { columns?: string[]; filters: FilterOptions; maxRows: number; keepLast?: boolean }
): Promise<FilteredRows | { error: string }> {
  const totalRows = Number(context.metadata.num_rows);
  const types = columnTypesFromMetadata(context.metadata);
  const allColumns = Object.keys(types);
  const prepared = prepareFilters(allColumns, detectDateColumnFromTypes(types), options.filters);
  if (prepared.error) return { error: prepared.error };

  // Always read the columns the filters need, even if the user's "columns" list leaves them out
  const readColumns = options.columns ? [...new Set([...options.columns, ...prepared.neededColumns])] : undefined;
  const take = (matches: number[]) => (options.keepLast ? matches.slice(-options.maxRows) : matches.slice(0, options.maxRows));
  let picked: Record<string, any>[];
  let matchedRows: number;
  let capped = false;

  if (prepared.neededColumns.length === 0) {
    // Nothing to filter on: just read the first (or last) maxRows rows
    const count = Math.min(options.maxRows, totalRows);
    const rowStart = options.keepLast ? totalRows - count : 0;
    picked = count > 0
      ? await parquetReadObjects({ file: context.file, metadata: context.metadata, rowStart, rowEnd: rowStart + count, columns: readColumns, compressors, parsers: parquetParsers })
      : [];
    matchedRows = totalRows;
  } else if (totalRows * (readColumns?.length || allColumns.length || 1) <= FULL_READ_CELL_LIMIT) {
    // Small enough: unpack once and filter in memory
    const rows = await parquetReadObjects({ file: context.file, metadata: context.metadata, columns: readColumns, compressors, parsers: parquetParsers });
    const matches = runFilters(prepared, rows.length, (column, i) => rows[i][column]);
    matchedRows = matches.length;
    picked = take(matches).map(i => rows[i]);
  } else if (totalRows > NARROW_SCAN_ROW_LIMIT) {
    return { error: tooLargeMessage(totalRows) };
  } else {
    // Big file: find matching row numbers from the filter columns only, then load just those rows
    const arrays = await readColumnArrays(context, prepared.neededColumns);
    const matches = runFilters(prepared, totalRows, (column, i) => arrays[column][i]);
    matchedRows = matches.length;
    const result = await readRowsAt(context, take(matches), readColumns, options.keepLast);
    picked = result.rows;
    capped = result.capped;
  }

  return {
    data: processBigIntValues(picked),
    schema: inferSchemaFromRawRows(picked),
    totalRows,
    matchedRows,
    appliedFilters: prepared.appliedFilters,
    capped,
  };
}

/**
 * Latest date in the file, at the precision the data uses ("2024", "2024-06" or "2024-06-30").
 * 1) Use the min/max statistics stored in the file footer (no data download needed).
 * 2) Otherwise scan just the date column, if the file isn't huge.
 * Returns null when it can't tell. WHY: the old code invented "the current month" instead,
 * so files without dates were reported as up to date.
 */
async function findLatestDate(context: RawParquetContext, dateColumn: string | null): Promise<string | null> {
  if (!dateColumn) return null;
  // Only real dates or date strings count; plain numbers in a "date" column can't be trusted
  const isUsable = (value: unknown) => value instanceof Date || typeof value === 'string';

  let values: unknown[] = [];
  let statsComplete = context.metadata.row_groups.length > 0;
  for (const rowGroup of context.metadata.row_groups) {
    const stats = rowGroup.columns.find(chunk => chunk.meta_data?.path_in_schema[0] === dateColumn)?.meta_data?.statistics;
    const max = stats?.max_value ?? stats?.max;
    const min = stats?.min_value ?? stats?.min;
    if (!isUsable(max)) {
      statsComplete = false;
      break;
    }
    values.push(max);
    if (isUsable(min)) values.push(min);
  }

  if (!statsComplete) {
    if (Number(context.metadata.num_rows) > NARROW_SCAN_ROW_LIMIT) return null;
    values = (await readColumnArrays(context, [dateColumn]))[dateColumn].filter(isUsable);
  }

  const parseDate = createDateParser();
  const tracker = createLatestDateTracker();
  for (const value of values) {
    const parsed = parseDate(value);
    if (parsed) tracker.add(parsed);
  }
  const latest = tracker.result();
  return latest ? formatDateForGranularity(latest.date, latest.granularity) : null;
}

const isGovMyHost = (hostname: string) => hostname === 'gov.my' || hostname.endsWith('.gov.my');

/**
 * Only fetch parquet files from official Malaysian government hosts over HTTPS.
 * WHY: otherwise anyone using the public server could make it download from any address
 * (including private/internal ones) or point it at huge files.
 * Two harmless rewrites keep old dashboard links working:
 *  - http://storage.dosm.gov.my/... -> https://storage.dosm.gov.my/... (same files over HTTPS)
 *  - https://s3.ap-southeast-1.amazonaws.com/storage.dosm.gov.my/... -> https://storage.dosm.gov.my/...
 */
function resolveParquetUrl(rawUrl: string): { url: string } | { error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { error: `Not a valid URL: ${rawUrl}` };
  }
  if (parsed.hostname === 's3.ap-southeast-1.amazonaws.com') {
    const [, bucket, ...rest] = parsed.pathname.split('/');
    if (bucket && isGovMyHost(bucket)) parsed = new URL(`https://${bucket}/${rest.join('/')}${parsed.search}`);
  }
  if (parsed.protocol === 'http:' && isGovMyHost(parsed.hostname)) parsed.protocol = 'https:';
  if (parsed.protocol !== 'https:' || !isGovMyHost(parsed.hostname)) {
    return {
      error: `Only https:// URLs on official *.gov.my hosts are allowed (for example https://storage.data.gov.my/... or https://storage.dosm.gov.my/...). Got: ${parsed.protocol}//${parsed.host}`,
    };
  }
  return { url: parsed.toString() };
}

function urlNotAllowedResponse(url: string, message: string) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ error: 'URL not allowed', message, url, timestamp: new Date().toISOString() }, null, 2),
    }],
  };
}

/** Explain a refused or invalid request (bad filter, file too big) without pretending to parse it. */
function refusalResponse(filename: string, url: string, message: string, extra: Record<string, any> = {}) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ filename, url, error: 'Request not processed', message, ...extra, timestamp: new Date().toISOString() }, null, 2),
    }],
  };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2024" / "2024-06" / "2024-06-30" -> { data_as_of, data_as_of_formatted }; nothing if unknown. */
function formatAsOfValue(asOfValue?: string | null): Record<string, string> {
  if (!asOfValue) {
    return {};
  }

  const yearlyMatch = /^(\d{4})$/.exec(asOfValue);
  if (yearlyMatch) {
    return { data_as_of: asOfValue, data_as_of_formatted: yearlyMatch[1] };
  }

  const monthlyMatch = /^(\d{4})-(\d{2})$/.exec(asOfValue);
  if (monthlyMatch) {
    const month = Number(monthlyMatch[2]);
    const formattedMonth = MONTH_NAMES[month - 1] || 'Unknown';
    return { data_as_of: asOfValue, data_as_of_formatted: `${formattedMonth} ${monthlyMatch[1]}` };
  }

  const dailyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOfValue);
  if (dailyMatch) {
    const month = Number(dailyMatch[2]);
    const formattedMonth = MONTH_NAMES[month - 1] || 'Unknown';
    return { data_as_of: asOfValue, data_as_of_formatted: `${formattedMonth} ${Number(dailyMatch[3])}, ${dailyMatch[1]}` };
  }

  return { data_as_of: asOfValue, data_as_of_formatted: asOfValue };
}

/**
 * Compute per-column statistical summaries in a single pass over the data.
 * @param data Array of data row objects
 * @param schema The inferred schema (column name -> JS typeof)
 * @returns Array of column summaries
 */
function computeColumnSummaries(
  data: Record<string, any>[],
  schema: Record<string, string>
): ColumnSummary[] {
  if (!data || data.length === 0) return [];

  const columns = Object.keys(schema);
  const summaries: ColumnSummary[] = [];

  for (const col of columns) {
    // Collect sample values for classification
    const sampleValues = data.slice(0, 20).map(row => row[col]);
    const colType = classifyColumnType(col, schema[col], sampleValues);

    // Single-pass accumulation
    let nonNullCount = 0;
    let nullCount = 0;

    if (colType === 'numeric') {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      const values: number[] = [];

      for (const row of data) {
        const raw = row[col];
        if (raw === null || raw === undefined) { nullCount++; continue; }
        const num = typeof raw === 'string' ? Number(raw) : raw;
        if (typeof num !== 'number' || isNaN(num)) { nullCount++; continue; }
        nonNullCount++;
        if (num < min) min = num;
        if (num > max) max = num;
        sum += num;
        if (values.length < 10000) values.push(num);
      }

      let median: number | null = null;
      if (values.length > 0 && values.length <= 10000) {
        values.sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
      }

      summaries.push({
        name: col,
        type: 'numeric',
        nonNullCount,
        nullCount,
        min: nonNullCount > 0 ? min : null,
        max: nonNullCount > 0 ? max : null,
        mean: nonNullCount > 0 ? Math.round((sum / nonNullCount) * 100) / 100 : null,
        median: median !== null ? Math.round(median * 100) / 100 : null,
      });
    } else if (colType === 'string') {
      const freqMap = new Map<string, number>();

      for (const row of data) {
        const val = row[col];
        if (val === null || val === undefined) { nullCount++; continue; }
        nonNullCount++;
        const str = String(val);
        freqMap.set(str, (freqMap.get(str) || 0) + 1);
      }

      const topValues = Array.from(freqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));

      summaries.push({
        name: col,
        type: 'string',
        nonNullCount,
        nullCount,
        uniqueCount: freqMap.size,
        topValues,
      });
    } else if (colType === 'date') {
      let earliest: StrictParsedDate | null = null;
      let latest: StrictParsedDate | null = null;

      for (const row of data) {
        const val = row[col];
        if (val === null || val === undefined) { nullCount++; continue; }
        const parsed = strictParseDateDetails(val);
        if (!parsed) { nullCount++; continue; }
        nonNullCount++;
        if (!earliest || parsed.date < earliest.date) earliest = parsed;
        if (!latest || parsed.date > latest.date) latest = parsed;
      }

      const spanDays = earliest && latest
        ? Math.round((latest.date.getTime() - earliest.date.getTime()) / 86400000)
        : null;

      summaries.push({
        name: col,
        type: 'date',
        nonNullCount,
        nullCount,
        earliest: earliest ? formatDateForGranularity(earliest.date, earliest.granularity) : null,
        latest: latest ? formatDateForGranularity(latest.date, latest.granularity) : null,
        spanDays,
      });
    } else if (colType === 'boolean') {
      let trueCount = 0;
      let falseCount = 0;

      for (const row of data) {
        const val = row[col];
        if (val === null || val === undefined) { nullCount++; continue; }
        nonNullCount++;
        if (val) trueCount++; else falseCount++;
      }

      summaries.push({
        name: col,
        type: 'boolean',
        nonNullCount,
        nullCount,
        trueCount,
        falseCount,
      });
    } else {
      for (const row of data) {
        if (row[col] === null || row[col] === undefined) nullCount++; else nonNullCount++;
      }

      summaries.push({
        name: col,
        type: 'other',
        nonNullCount,
        nullCount,
      });
    }
  }

  return summaries;
}

/**
 * Extract first N and last N sample rows, avoiding overlap for small datasets.
 * @param data The full data array
 * @param count Number of rows for head and tail (default 3)
 * @returns Object with first and last sample rows
 */
function smartSample(data: Record<string, any>[], count: number = 3): { first: Record<string, any>[]; last: Record<string, any>[] } {
  const first = data.slice(0, Math.min(count, data.length));
  const lastStart = Math.max(first.length, data.length - count);
  return {
    first,
    last: lastStart < data.length ? data.slice(lastStart) : [],
  };
}

function buildSampleRows(
  sampledData: Record<string, any>[],
  totalRows: number,
  tailRows: Record<string, any>[],
  count: number = 3
): { first: Record<string, any>[]; last: Record<string, any>[] } {
  const fallback = smartSample(sampledData, count);
  if (tailRows.length === 0) {
    return fallback;
  }

  const overlap = Math.max(0, fallback.first.length + tailRows.length - totalRows);
  return {
    first: fallback.first,
    last: overlap > 0 ? tailRows.slice(overlap) : tailRows,
  };
}

/**
 * Fetch the actual last N rows from a parquet file using metadata for the true row count.
 * @param url URL of the parquet file
 * @param count Number of tail rows to fetch
 * @returns The real last N rows, or empty array on failure
 */
async function getActualTailRows(
  url: string,
  count: number = 3,
  context?: RawParquetContext,
  columns?: string[]
): Promise<Record<string, any>[]> {
  try {
    const activeContext = context ?? await getRawParquetContext(url);
    const totalRows = Number(activeContext.metadata.num_rows);
    if (totalRows === 0) {
      return [];
    }

    const tailCount = Math.min(count, totalRows);
    const tailData = await parquetReadObjects({
      file: activeContext.file,
      metadata: activeContext.metadata,
      rowStart: totalRows - tailCount,
      rowEnd: totalRows,
      columns, // respect the user's column selection
      compressors,
      parsers: parquetParsers,
    });

    return processBigIntValues(tailData);
  } catch {
    return [];
  }
}

/**
 * Compute grouped aggregation of numeric columns by a grouping column.
 * @param data The data rows
 * @param groupByColumn Column to group by
 * @param schema The inferred schema
 * @returns Grouped aggregation result, or an error object
 */
function computeGroupedAggregation(
  data: Record<string, any>[],
  groupByColumn: string,
  schema: Record<string, string>
): GroupedAggregation | { error: string; availableColumns: string[] } {
  if (!data || data.length === 0) {
    return { error: 'No data to group', availableColumns: Object.keys(schema) };
  }

  const columns = Object.keys(schema);
  if (!columns.includes(groupByColumn)) {
    return { error: `Column '${groupByColumn}' not found`, availableColumns: columns };
  }

  // Identify numeric columns (excluding the group-by column)
  const numericCols = columns.filter(col => {
    if (col === groupByColumn) return false;
    const sampleValues = data.slice(0, 20).map(row => row[col]);
    return classifyColumnType(col, schema[col], sampleValues) === 'numeric';
  });

  // Group rows
  const groups = new Map<string, Record<string, any>[]>();
  for (const row of data) {
    const key = String(row[groupByColumn] ?? '(null)');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // Build aggregation per group, sorted by count descending
  const MAX_GROUPS = 50;
  let sortedGroups = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length);

  const totalGroups = sortedGroups.length;
  const truncated = totalGroups > MAX_GROUPS;
  if (truncated) sortedGroups = sortedGroups.slice(0, MAX_GROUPS);

  const result: GroupedAggregation = {
    groupedBy: groupByColumn,
    groups: sortedGroups.map(([key, rows]) => {
      const aggregations: Record<string, { sum: number; mean: number; min: number; max: number }> = {};

      for (const numCol of numericCols) {
        let sum = 0, min = Infinity, max = -Infinity, count = 0;
        for (const row of rows) {
          const raw = row[numCol];
          const num = typeof raw === 'string' ? Number(raw) : raw;
          if (typeof num === 'number' && !isNaN(num)) {
            sum += num; count++;
            if (num < min) min = num;
            if (num > max) max = num;
          }
        }
        if (count > 0) {
          aggregations[numCol] = {
            sum: Math.round(sum * 100) / 100,
            mean: Math.round((sum / count) * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
          };
        }
      }

      return { key, count: rows.length, aggregations };
    }),
  };

  if (truncated) {
    result.truncated = true;
    result.totalGroups = totalGroups;
  }

  return result;
}

// (Filtering now lives in prepareFilters / runFilters / readFilteredRows above.)

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

// ---------------------------------------------------------------------------
// Where can a parquet file's data be viewed?
// WHY: this used to be guessed from words in the filename, so almost every file got the
// generic https://data.gov.my/dashboard. The real links are in the metadata we already load:
// each dashboard chart names its source file, and each catalogue dataset names its download.
// ---------------------------------------------------------------------------

const GENERIC_DASHBOARD_PAGE = 'https://data.gov.my/dashboard';

/**
 * One comparable form of a file address: https, lower-case host, no query or trailing spaces.
 * Upstream writes the same file several ways (http:// vs https://, or the S3 address of the
 * storage.dosm.gov.my bucket), and one chart source even ends with a space.
 */
function normalizeFileUrl(raw: string): string {
  const trimmed = raw.trim();
  const resolved = resolveParquetUrl(trimmed); // gov.my links: https + S3 rewrite
  try {
    const parsed = new URL('url' in resolved ? resolved.url : trimmed);
    return `https://${parsed.hostname.toLowerCase()}${parsed.pathname}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Catalogue page(s) for a dataset: data.gov.my always, plus OpenDOSM when it is listed there. */
function cataloguePages(ds: DatasetMetadata): { url: string; opendosm_url?: string } {
  const sites = Array.isArray(ds.site_category)
    ? ds.site_category.map(c => (c as { site?: unknown } | null)?.site)
    : [];
  return {
    url: `https://data.gov.my/data-catalogue/${ds.id}`,
    ...(sites.includes('opendosm') ? { opendosm_url: `https://open.dosm.gov.my/data-catalogue/${ds.id}` } : {}),
  };
}

export interface ParquetPages {
  /** What kind of page best_url is */
  match: 'dashboard_chart' | 'data_catalogue' | 'none';
  /** The single best page to open */
  best_url: string;
  /** Dashboards with a chart that reads exactly this file */
  dashboards: Array<{ dashboard_name: string; url?: string; charts: string[] }>;
  /** Data catalogue datasets whose download is this file */
  datasets: Array<{ id: string; title_en: string; url: string; opendosm_url?: string }>;
  /** For catalogue files: dashboards with similar names (suggestions, not exact links) */
  related_dashboards: Array<{ dashboard_name: string; url?: string }>;
}

// A name match needs at least two query words in the dashboard's name/route to count as related
const RELATED_DASHBOARD_MIN_SCORE = 8;

/** Find the pages that show a parquet file's data. Pure function (no network), so it can be tested. */
export function findPagesForParquet(
  rawUrl: string,
  datasets: DatasetMetadata[],
  dashboards: DashboardMetadata[]
): ParquetPages {
  const target = normalizeFileUrl(rawUrl);

  const dashboardHits: ParquetPages['dashboards'] = [];
  for (const d of dashboards) {
    const charts = Object.entries(d.charts ?? {})
      .filter(([, chart]) => {
        const source = (chart as { chart_source?: unknown } | null)?.chart_source;
        return typeof source === 'string' && normalizeFileUrl(source) === target;
      })
      .map(([chartId]) => chartId);
    if (charts.length > 0) dashboardHits.push({ dashboard_name: d.dashboard_name, url: dashboardUrl(d), charts });
  }

  const datasetHits: ParquetPages['datasets'] = datasets
    .filter(ds => typeof ds.link_parquet === 'string' && normalizeFileUrl(ds.link_parquet) === target)
    .map(ds => ({ id: ds.id, title_en: ds.title_en, ...cataloguePages(ds) }));

  // Catalogue files aren't read by dashboard charts directly, so suggest dashboards whose
  // name matches the dataset's title (e.g. formal wages percentiles -> Formal Sector Wages)
  const related = dashboardHits.length === 0 && datasetHits.length > 0
    ? rankDashboards(datasetHits[0].title_en, dashboards)
        .filter(result => result.score >= RELATED_DASHBOARD_MIN_SCORE)
        .slice(0, 3)
        .map(({ dashboard }) => ({ dashboard_name: dashboard.dashboard_name, url: dashboardUrl(dashboard) }))
    : [];

  const firstDashboardUrl = dashboardHits.find(hit => hit.url)?.url;
  if (firstDashboardUrl) {
    return { match: 'dashboard_chart', best_url: firstDashboardUrl, dashboards: dashboardHits, datasets: datasetHits, related_dashboards: related };
  }
  if (datasetHits.length > 0) {
    return { match: 'data_catalogue', best_url: datasetHits[0].url, dashboards: dashboardHits, datasets: datasetHits, related_dashboards: related };
  }
  return { match: 'none', best_url: GENERIC_DASHBOARD_PAGE, dashboards: dashboardHits, datasets: datasetHits, related_dashboards: related };
}

/** Best page to view a parquet file's data. Never throws: falls back to the generic dashboard list. */
async function viewPageForParquet(url: string): Promise<string> {
  try {
    const [datasets, dashboards] = await Promise.all([getDatasets(), getDashboards()]);
    return findPagesForParquet(url, datasets, dashboards).best_url;
  } catch {
    return GENERIC_DASHBOARD_PAGE;
  }
}

/**
 * Parse a Parquet file from a URL using hyparquet
 * @param url URL of the Parquet file
 * @param maxRows Maximum number of rows to return
 * @returns Parsed Parquet data
 */
async function parseParquetFromUrl(url: string, maxRows: number = 500): Promise<any> {
  try {
    // Open the file and read its footer (row count, schema, date statistics)
    const context = await getRawParquetContext(url);

    // Parse the Parquet file using hyparquet with compressors for BROTLI support.
    // Always stop at maxRows: there is no "read everything" mode any more.
    const parquetData = await parquetReadObjects({
      file: context.file,
      metadata: context.metadata,
      rowStart: 0,
      rowEnd: Math.max(1, maxRows),
      compressors,
      parsers: parquetParsers,
    });

    // Process the data to handle BigInt values
    // (Dates are decoded by parquetParsers, so no "empty date object" patching, and no invented dates.)
    const processedData = processBigIntValues(parquetData);

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
    
    // WHY: totalRows used to be the number of rows we happened to read (e.g. 500), not the
    // file's real size. The file footer knows the true count.
    const totalRows = Number(context.metadata.num_rows);

    // Latest date across the WHOLE file (not just the rows shown); null if there is none
    const latestDate = await findLatestDate(context, detectDateColumnFromTypes(columnTypesFromMetadata(context.metadata)));

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
    'Parse and display data from a Parquet file URL (official https://*.gov.my hosts such as storage.data.gov.my and storage.dosm.gov.my). Supports raw output (default), AI-friendly statistical summaries, and latest-period filtering. Data can be filtered by date range, column value, and column selection.',
    {
      url: z.string().url().describe('URL of the Parquet file to parse (must be https on a *.gov.my host)'),
      maxRows: z.number().min(1).max(2000).optional().describe('Maximum number of rows to return or sample for statistics (default 500)'),
      output_mode: z.enum(['raw', 'summary', 'latest']).optional().describe('Output format. "raw" (default) returns full row data. "summary" returns column statistics and sample rows for AI consumption. "latest" returns only the most recent time period.'),
      group_by: z.string().optional().describe('Column to group by (summary mode only). Returns aggregated numeric stats per group.'),
      columns: z.array(z.string()).optional().describe('List of column names to include. Omit to include all columns. Reduces response size and speeds up parsing.'),
      filter_date_from: z.string().optional().describe('Start date (inclusive) for date range filtering, e.g. "2025-01-01" or "2025". Auto-detects the date column.'),
      filter_date_to: z.string().optional().describe('End date (inclusive) for date range filtering, e.g. "2025-12-31" or "2025". Auto-detects the date column.'),
      filter_column: z.string().optional().describe('Column name to filter on (exact match). Use with filter_value.'),
      filter_value: z.string().optional().describe('Value to match in filter_column (exact string match).'),
    },
    async ({ url: requestedUrl, maxRows = 500, output_mode = 'raw', group_by, columns, filter_date_from, filter_date_to, filter_column, filter_value }) => {
      // Only fetch from official government hosts over HTTPS (see resolveParquetUrl)
      const resolved = resolveParquetUrl(requestedUrl);
      if ('error' in resolved) return urlNotAllowedResponse(requestedUrl, resolved.error);
      const url = resolved.url;
      const filename = url.split('/').pop() || 'unknown.parquet';

      // Helper for fallback error response
      const fallbackResponse = async (error: unknown) => {
        try {
          const metadata = await getParquetMetadata(url);
          const structureInfo = estimateParquetStructure(metadata.filename);
          const dashboardUrl = await viewPageForParquet(url);
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                filename: metadata.filename, url: metadata.url,
                fileSize: metadata.fileSize ? `${Math.round(metadata.fileSize / 1024 / 1024 * 100) / 100} MB` : 'Unknown',
                lastModified: metadata.lastModified || 'Unknown',
                contentType: metadata.contentType || 'application/octet-stream',
                estimatedStructure: structureInfo, viewableAt: dashboardUrl,
                error: 'Failed to parse Parquet file',
                errorMessage: error instanceof Error ? error.message : String(error),
                note: 'Falling back to estimated structure. You can view the data at the dashboard URL.',
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };
        } catch (fallbackError) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Failed to process Parquet file',
                message: error instanceof Error ? error.message : String(error),
                fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                url, timestamp: new Date().toISOString(),
                note: 'Parquet files can be viewed through their corresponding dashboards on data.gov.my',
              }, null, 2),
            }],
          };
        }
      };

      // Shared filter options. A column filter only counts when a value is given too.
      const filterOpts = { filter_date_from, filter_date_to, filter_column, filter_value };
      const hasFilters = !!(filter_date_from || filter_date_to || (filter_column && filter_value !== undefined));

      // RAW MODE (default, backward compatible)
      if (output_mode === 'raw') {
        try {
          if (!hasFilters && !columns) {
            // Original path — no filters, full backward compatibility
            const parquetData = await parseParquetFromUrl(url, maxRows);
            // No date column (or no readable dates) -> no data_as_of at all, rather than a made-up one
            const dateInfo = formatAsOfValue(parquetData.detected_date);

            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url,
                  schema: parquetData.schema,
                  totalRows: parquetData.totalRows,
                  displayedRows: parquetData.displayedRows,
                  data: parquetData.data,
                  ...dateInfo,
                  timestamp: new Date().toISOString(),
                }, bigIntSerializer, 2),
              }],
            };
          }

          // Filtered / column-selected raw mode. Memory stays bounded even for million-row files
          // (see readFilteredRows); "data_as_of" describes the whole file.
          const context = await getRawParquetContext(url);
          const result = await readFilteredRows(context, { columns, filters: filterOpts, maxRows });
          if ('error' in result) {
            return refusalResponse(filename, url, result.error, { totalRows: Number(context.metadata.num_rows) });
          }
          const dateInfo = formatAsOfValue(
            await findLatestDate(context, detectDateColumnFromTypes(columnTypesFromMetadata(context.metadata)))
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                filename, url,
                schema: result.schema,
                totalRows: result.totalRows,
                ...(hasFilters ? { matchedRows: result.matchedRows } : {}),
                displayedRows: result.data.length,
                filters: result.appliedFilters,
                ...(columns ? { selectedColumns: columns } : {}),
                data: result.data,
                note: result.capped
                  ? 'The matching rows are spread far apart in this file, so only the first ones are shown. Narrow the filter (e.g. add a date range) to see others.'
                  : undefined,
                ...dateInfo,
                timestamp: new Date().toISOString(),
              }, bigIntSerializer, 2),
            }],
          };
        } catch (error) {
          return fallbackResponse(error);
        }
      }

      // SUMMARY MODE
      if (output_mode === 'summary') {
        try {
          const context = await getRawParquetContext(url);
          let data: Record<string, any>[];
          let schema: Record<string, string>;
          let appliedFilters: Record<string, any> = {};
          let matchedRows = 0;
          if (hasFilters) {
            // Statistics are computed on (up to maxRows of) the rows that match the filters
            const result = await readFilteredRows(context, { columns, filters: filterOpts, maxRows });
            if ('error' in result) {
              return refusalResponse(filename, url, result.error, { totalRows: Number(context.metadata.num_rows) });
            }
            ({ data, schema, appliedFilters, matchedRows } = result);
          } else {
            ({ data, schema } = await readRawParquetRows(url, { rowStart: 0, rowEnd: maxRows, columns, context }));
          }
          const totalRows = Number(context.metadata.num_rows);
          const sampledRows = data.length;
          const isExact = !hasFilters && sampledRows >= totalRows;

          const columnSummaries = computeColumnSummaries(data, schema);

          // Tail rows: skip if filters are active (tail of filtered data is more meaningful)
          let sampleRows;
          if (hasFilters) {
            sampleRows = smartSample(data, 3);
          } else {
            const tailRows = await getActualTailRows(url, 3, context, columns);
            sampleRows = buildSampleRows(data, totalRows, tailRows, 3);
          }

          const groupedAggregation = group_by
            ? computeGroupedAggregation(data, group_by, schema)
            : null;

          // "data_as_of" describes the whole file, not just the sampled rows (which used to make
          // a long time series look decades old)
          const dateInfo = formatAsOfValue(
            await findLatestDate(context, detectDateColumnFromTypes(columnTypesFromMetadata(context.metadata)))
          );

          const notePrefix = hasFilters
            ? `Statistics are based on ${sampledRows} of the ${matchedRows} rows that matched the filters.`
            : isExact
              ? 'Statistics are based on the complete dataset.'
              : `Statistics are based on the first ${sampledRows} of ${totalRows} rows. For full data, use output_mode "raw".`;

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                filename, url,
                totalRows,
                sampledRows,
                note: notePrefix,
                ...(hasFilters ? { filters: appliedFilters } : {}),
                ...(columns ? { selectedColumns: columns } : {}),
                totalColumns: Object.keys(schema).length,
                schema,
                columnSummaries,
                sampleRows,
                groupedAggregation,
                ...dateInfo,
                timestamp: new Date().toISOString(),
              }, bigIntSerializer, 2),
            }],
          };
        } catch (error) {
          return fallbackResponse(error);
        }
      }

      // LATEST MODE
      if (output_mode === 'latest') {
        try {
          const context = await getRawParquetContext(url);
          const totalRows = Number(context.metadata.num_rows);
          const types = columnTypesFromMetadata(context.metadata);
          const dateCol = detectDateColumnFromTypes(types);

          if (totalRows === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url, totalRows, data: [],
                  note: 'No data found in the file.',
                  timestamp: new Date().toISOString(),
                }, null, 2),
              }],
            };
          }

          if (!dateCol) {
            // No date column: return the LAST rows, after applying any column filter.
            // (Before, the filter was silently dropped here and unfiltered rows were returned.)
            const result = await readFilteredRows(context, { columns, filters: filterOpts, maxRows, keepLast: true });
            if ('error' in result) return refusalResponse(filename, url, result.error, { totalRows });

            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url,
                  totalRows,
                  displayedRows: result.data.length,
                  warning: 'No date column detected. Returning the last rows of the dataset.',
                  ...(hasFilters ? { filters: result.appliedFilters, matchedRows: result.matchedRows } : {}),
                  schema: result.schema,
                  data: result.data,
                  timestamp: new Date().toISOString(),
                }, bigIntSerializer, 2),
              }],
            };
          }

          // Step 1: read ONLY the date column (plus the filter column, if any) for every row.
          // WHY: loading every column of every row used ~1 GB for a 1.8-million-row file.
          const prepared = prepareFilters(Object.keys(types), dateCol, filterOpts);
          if (prepared.error) return refusalResponse(filename, url, prepared.error, { totalRows });
          if (totalRows > NARROW_SCAN_ROW_LIMIT) return refusalResponse(filename, url, tooLargeMessage(totalRows), { totalRows });
          const arrays = await readColumnArrays(context, [...new Set([dateCol, ...prepared.neededColumns])]);
          const candidates = prepared.neededColumns.length > 0
            ? runFilters(prepared, totalRows, (column, i) => arrays[column][i])
            : Array.from({ length: totalRows }, (_, i) => i);
          // Make sure the date column is in the output even if "columns" left it out
          const readColumns = columns ? [...new Set([...columns, dateCol])] : undefined;

          if (candidates.length === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url, totalRows, data: [],
                  filters: prepared.appliedFilters,
                  note: 'No rows matched the filters.',
                  timestamp: new Date().toISOString(),
                }, null, 2),
              }],
            };
          }

          // Step 2: find the latest period with a loop (Math.max(...) crashed above ~120k rows)
          const parseDate = createDateParser();
          const tracker = createLatestDateTracker();
          for (const i of candidates) {
            const parsed = parseDate(arrays[dateCol][i]);
            if (parsed) tracker.add(parsed);
          }
          const latest = tracker.result();

          if (!latest) {
            const { rows } = await readRowsAt(context, candidates.slice(-maxRows), readColumns, true);
            const fallbackData = processBigIntValues(rows);
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url,
                  totalRows,
                  displayedRows: fallbackData.length,
                  warning: `Date column '${dateCol}' found but no dates could be parsed. Returning the last rows of the dataset without date filtering.`,
                  schema: inferSchemaFromRawRows(rows),
                  data: fallbackData,
                  timestamp: new Date().toISOString(),
                }, bigIntSerializer, 2),
              }],
            };
          }

          const granularity = latest.granularity;
          const periodLabel = formatDateForGranularity(latest.date, granularity);
          const periodRows = candidates.filter(i => {
            const parsed = parseDate(arrays[dateCol][i]);
            return parsed !== null && formatDateForGranularity(parsed.date, granularity) === periodLabel;
          });

          // Step 3: load full rows only for the first maxRows rows of that period
          const { rows, capped } = await readRowsAt(context, periodRows.slice(0, maxRows), readColumns);
          const displayedRows = processBigIntValues(rows);
          const dateInfo = formatAsOfValue(periodLabel);

          const note = periodRows.length > displayedRows.length
            ? `Showing the first ${displayedRows.length} rows from the latest ${granularity} period${capped ? ' (its rows are spread far apart in the file, so fewer are shown)' : ''}.`
            : undefined;

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                filename, url,
                filter_applied: {
                  column: dateCol,
                  granularity,
                  period: periodLabel,
                  matchedRows: periodRows.length,
                  displayedRows: displayedRows.length,
                },
                ...(hasFilters ? { filters: prepared.appliedFilters } : {}),
                ...(columns ? { selectedColumns: columns } : {}),
                totalRows,
                schema: inferSchemaFromRawRows(rows),
                data: displayedRows,
                note,
                ...dateInfo,
                timestamp: new Date().toISOString(),
              }, bigIntSerializer, 2),
            }],
          };
        } catch (error) {
          return fallbackResponse(error);
        }
      }

      // Should not reach here, but handle gracefully
      return fallbackResponse(new Error(`Unknown output_mode: ${output_mode}`));
    }
  );
  
  // Get information about a Parquet file from a URL
  server.tool(
    prefixToolName('get_parquet_info'),
    'Get metadata and structure information about a Parquet file (official https://*.gov.my hosts only)',
    {
      url: z.string().url().describe('URL of the Parquet file to analyze (must be https on a *.gov.my host)'),
    },
    async ({ url: requestedUrl }) => {
      // Only fetch from official government hosts over HTTPS (see resolveParquetUrl)
      const resolved = resolveParquetUrl(requestedUrl);
      if ('error' in resolved) return urlNotAllowedResponse(requestedUrl, resolved.error);
      const url = resolved.url;
      try {
        // Everything comes from the file footer (row count, column types, date statistics).
        // WHY: this used to download and unpack EVERY row, then crash on files over ~120k rows
        // and fall back to a made-up "estimated" structure.
        const context = await getRawParquetContext(url);
        const columnTypes = columnTypesFromMetadata(context.metadata);
        const dateColumn = detectDateColumnFromTypes(columnTypes);
        const latestDate = await findLatestDate(context, dateColumn);

        // Get metadata about the Parquet file
        const metadata = await getParquetMetadata(url);

        // The page that shows this file's data (its dashboard or catalogue page)
        const dashboardUrl = await viewPageForParquet(url);

        const fileSize = context.file.byteLength || metadata.fileSize;
        const formattedInfo = {
          filename: metadata.filename,
          url: metadata.url,
          fileSize: fileSize ? `${Math.round(fileSize / 1024 / 1024 * 100) / 100} MB` : 'Unknown',
          lastModified: metadata.lastModified || 'Unknown',
          contentType: metadata.contentType || 'application/octet-stream',
          schema: columnTypes,
          totalRows: Number(context.metadata.num_rows),
          ...(dateColumn ? { dateColumn } : {}),
          // Only report an "as of" date the file actually contains; never the current month
          ...(latestDate
            ? formatAsOfValue(latestDate)
            : { data_as_of: null, data_as_of_note: dateColumn ? `Could not read dates from column '${dateColumn}'.` : 'No date column found in this file.' }),
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

          // The page that shows this file's data (its dashboard or catalogue page)
          const dashboardUrl = await viewPageForParquet(url);
          
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
    'Find the page where a Parquet file\'s data can be viewed: the dashboard whose charts read it, or the data catalogue page of the dataset it belongs to (with related dashboards)',
    {
      url: z.string().url().describe('URL of the parquet file'),
    },
    async ({ url }) => {
      try {
        // Extract the filename from the URL
        const filename = url.trim().split('/').pop() || 'unknown.parquet';

        // Look the file up in the dashboard and catalogue metadata (no download needed)
        const [datasets, dashboards] = await Promise.all([getDatasets(), getDashboards()]);
        const pages = findPagesForParquet(url, datasets, dashboards);

        const notes: Record<ParquetPages['match'], string> = {
          dashboard_chart: `This file feeds the dashboard at dashboardUrl (charts: ${pages.dashboards.flatMap(d => d.charts).join(', ')}).`,
          data_catalogue: `This file is the download for the data catalogue dataset "${pages.datasets[0]?.title_en}"; its catalogue page (dashboardUrl) shows the data.` +
            (pages.related_dashboards.length > 0 ? ' related_dashboards are dashboards on the same topic (matched by name).' : ''),
          none: 'No dashboard chart or catalogue dataset links to this file. Browse the dashboards at dashboardUrl, or use search_all to find related data.',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                filename,
                parquetUrl: url,
                dashboardUrl: pages.best_url,
                match: pages.match,
                dashboards: pages.dashboards,
                datasets: pages.datasets,
                related_dashboards: pages.related_dashboards,
                note: notes[pages.match],
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
