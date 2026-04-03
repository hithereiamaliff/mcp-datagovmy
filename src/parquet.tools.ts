import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
// Import hyparquet with correct function names
import { parquetReadObjects, parquetMetadataAsync, asyncBufferFromUrl } from 'hyparquet';
// Import compressors for BROTLI support
import { compressors } from 'hyparquet-compressors';
import { prefixToolName } from './utils/tool-naming.js';

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

/**
 * Detect date column(s) from an object's keys.
 * Centralizes the heuristic used across date processing functions.
 * @param row A data row to inspect for date-like column names
 * @returns Array of column names that look like date columns
 */
function detectDateColumns(row: Record<string, any>): string[] {
  const dateColumns: string[] = [];
  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'date' || lowerKey.includes('date') || lowerKey === 'dt' || lowerKey === 'timestamp') {
      dateColumns.push(key);
    }
  }
  return dateColumns;
}

/**
 * Detect the primary date column from a row.
 * @param row A data row to inspect
 * @returns The first date column name found, or null
 */
function detectDateColumn(row: Record<string, any>): string | null {
  const cols = detectDateColumns(row);
  return cols.length > 0 ? cols[0] : null;
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
 * Unlike extractLatestDate/processEmptyDateObjects, this never falls back
 * to "current date" -- it only returns real parsed values.
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
  const dateColumns = detectDateColumns(firstRow);
  
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
  let dateColumn = detectDateColumn(firstRow);

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

async function getRawParquetContext(url: string): Promise<RawParquetContext> {
  const file = await asyncBufferFromUrl({ url });
  const metadata = await parquetMetadataAsync(file);
  return { file, metadata };
}

async function readRawParquetRows(
  url: string,
  options: {
    rowStart?: number;
    rowEnd?: number;
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
  context?: RawParquetContext
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

/**
 * Get the true total row count from parquet file metadata.
 * @param url URL of the parquet file
 * @returns Total number of rows, or null on failure
 */
async function getTrueRowCount(url: string): Promise<number | null> {
  try {
    const context = await getRawParquetContext(url);
    return Number(context.metadata.num_rows);
  } catch {
    return null;
  }
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
 * @returns Parsed Parquet data
 */
async function parseParquetFromUrl(url: string, maxRows: number = 500): Promise<any> {
  try {
    // Create an async buffer from the URL
    const file = await asyncBufferFromUrl({ url });
    
    // Parse the Parquet file using hyparquet with compressors for BROTLI support
    const rowEnd = maxRows > 0 ? maxRows : undefined;
    const parquetData = await parquetReadObjects({
      file,
      rowStart: 0,
      rowEnd,
      compressors,
      parsers: parquetParsers,
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
    'Parse and display data from a Parquet file URL. Supports raw output (default), AI-friendly statistical summaries, and latest-period filtering.',
    {
      url: z.string().url().describe('URL of the Parquet file to parse'),
      maxRows: z.number().min(1).max(2000).optional().describe('Maximum number of rows to return or sample for statistics (default 500)'),
      output_mode: z.enum(['raw', 'summary', 'latest']).optional().describe('Output format. "raw" (default) returns full row data. "summary" returns column statistics and sample rows for AI consumption. "latest" returns only the most recent time period.'),
      group_by: z.string().optional().describe('Column to group by (summary mode only). Returns aggregated numeric stats per group.'),
    },
    async ({ url, maxRows = 500, output_mode = 'raw', group_by }) => {
      const filename = url.split('/').pop() || 'unknown.parquet';
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      const formatAsOfValue = (asOfValue?: string) => {
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
          const formattedMonth = monthNames[month - 1] || 'Unknown';
          return { data_as_of: asOfValue, data_as_of_formatted: `${formattedMonth} ${monthlyMatch[1]}` };
        }

        const dailyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOfValue);
        if (dailyMatch) {
          const month = Number(dailyMatch[2]);
          const formattedMonth = monthNames[month - 1] || 'Unknown';
          return { data_as_of: asOfValue, data_as_of_formatted: `${formattedMonth} ${Number(dailyMatch[3])}, ${dailyMatch[1]}` };
        }

        return { data_as_of: asOfValue, data_as_of_formatted: asOfValue };
      };

      // Helper for fallback error response
      const fallbackResponse = async (error: unknown) => {
        try {
          const metadata = await getParquetMetadata(url);
          const structureInfo = estimateParquetStructure(metadata.filename);
          const dashboardUrl = estimateDashboardUrl(url);
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

      // RAW MODE (default, backward compatible)
      if (output_mode === 'raw') {
        try {
          const parquetData = await parseParquetFromUrl(url, maxRows);
          const currentDate = new Date();
          const detectedDate = parquetData.detected_date || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          const dateInfo = formatAsOfValue(detectedDate);

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
        } catch (error) {
          return fallbackResponse(error);
        }
      }

      // SUMMARY MODE
      if (output_mode === 'summary') {
        try {
          const parquetData = await readRawParquetRows(url, { rowStart: 0, rowEnd: maxRows });
          const data = parquetData.data;
          const schema = parquetData.schema;
          const totalRows = parquetData.totalRows;
          const sampledRows = data.length;
          const isExact = sampledRows >= totalRows;

          const columnSummaries = computeColumnSummaries(data, schema);
          const tailRows = await getActualTailRows(url, 3, parquetData.context);
          const sampleRows = buildSampleRows(data, totalRows, tailRows, 3);
          const groupedAggregation = group_by
            ? computeGroupedAggregation(data, group_by, schema)
            : null;

          const primaryDateColumn = detectDateColumnFromSchema(schema);
          const dateSummary = primaryDateColumn
            ? columnSummaries.find((summary): summary is DateColumnSummary => summary.type === 'date' && summary.name === primaryDateColumn)
            : columnSummaries.find((summary): summary is DateColumnSummary => summary.type === 'date');
          const dateInfo = formatAsOfValue(dateSummary?.latest ?? undefined);

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                filename, url,
                totalRows,
                sampledRows,
                note: isExact
                  ? 'Statistics are based on the complete dataset.'
                  : `Statistics are based on the first ${sampledRows} of ${totalRows} rows. For full data, use output_mode "raw".`,
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
          const parquetData = await readRawParquetRows(url);
          const data = parquetData.data;
          const schema = parquetData.schema;
          const totalRows = parquetData.totalRows;

          if (data.length === 0) {
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

          const dateCol = detectDateColumnFromSchema(schema) ?? detectDateColumn(data[0]);

          if (!dateCol) {
            const tailCount = Math.min(maxRows, totalRows);
            const tailRows = await getActualTailRows(url, tailCount, parquetData.context);
            const returnData = tailRows.length > 0 ? tailRows : data.slice(-tailCount);

            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url,
                  totalRows,
                  displayedRows: returnData.length,
                  warning: 'No date column detected. Returning the last rows of the dataset.',
                  schema,
                  data: returnData,
                  timestamp: new Date().toISOString(),
                }, bigIntSerializer, 2),
              }],
            };
          }

          const datesWithRows: Array<{ date: Date; row: Record<string, any>; granularity: DateGranularity }> = [];
          for (const row of data) {
            const parsed = strictParseDateDetails(row[dateCol]);
            if (parsed) {
              datesWithRows.push({ date: parsed.date, row, granularity: parsed.granularity });
            }
          }

          if (datesWithRows.length === 0) {
            const fallbackData = data.slice(-Math.min(maxRows, data.length));
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  filename, url,
                  totalRows,
                  displayedRows: fallbackData.length,
                  warning: `Date column '${dateCol}' found but no dates could be parsed. Returning the last rows of the dataset without date filtering.`,
                  schema,
                  data: fallbackData,
                  timestamp: new Date().toISOString(),
                }, bigIntSerializer, 2),
              }],
            };
          }

          let granularity: DateGranularity;
          if (datesWithRows.every(item => item.granularity === 'yearly')) {
            granularity = 'yearly';
          } else if (datesWithRows.every(item => item.granularity === 'yearly' || item.granularity === 'monthly')) {
            granularity = 'monthly';
          } else if (datesWithRows.every(item => item.date.getUTCDate() === 1 && item.date.getUTCMonth() === 0)) {
            granularity = 'yearly';
          } else if (datesWithRows.every(item => item.date.getUTCDate() === 1)) {
            granularity = 'monthly';
          } else {
            granularity = 'daily';
          }

          const latestDate = new Date(Math.max(...datesWithRows.map(item => item.date.getTime())));
          const periodLabel = formatDateForGranularity(latestDate, granularity);
          const filteredRows = datesWithRows
            .filter(item => formatDateForGranularity(item.date, granularity) === periodLabel)
            .map(item => item.row);
          const displayedRows = filteredRows.slice(0, maxRows);
          const dateInfo = formatAsOfValue(periodLabel);

          const note = filteredRows.length > displayedRows.length
            ? `Showing the first ${displayedRows.length} rows from the latest ${granularity} period.`
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
                  matchedRows: filteredRows.length,
                  displayedRows: displayedRows.length,
                },
                totalRows,
                schema,
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
