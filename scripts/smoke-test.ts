/**
 * Smoke test for the Malaysia Open Data MCP server.
 *
 * Starts the server in-process (no HTTP, no Docker), connects a real MCP client
 * to it, calls every tool once against the LIVE upstream APIs, and prints a
 * PASS / EMPTY / FAIL table. Use it after upstream changes (data.gov.my,
 * OpenDOSM, GitHub metadata) to see which tools broke.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts              # run every call below
 *   npx tsx scripts/smoke-test.ts search       # only calls whose tool name contains "search"
 *   npx tsx scripts/smoke-test.ts --list       # list tools and their parameters
 *   npx tsx scripts/smoke-test.ts flood --show # also print the start of each result
 *   npx tsx scripts/smoke-test.ts --url=https://mcp.techmavie.digital/datagovmy/mcp
 *                                              # test a DEPLOYED server over HTTP instead
 *
 * Exit code is 1 if any call FAILs, so it can be used in CI if wanted.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Each entry is one tool call. Tool names are without the "datagovmy_" prefix.
// Arguments are realistic values an AI client would send. `expectError: true`
// marks calls that SHOULD return a helpful error (e.g. an unknown dataset id).
const CALLS: Array<{ tool: string; args?: Record<string, unknown>; expectError?: boolean }> = [
  { tool: 'hello' },
  // Catalogue + dashboards (GitHub metadata index)
  { tool: 'search_all', args: { query: 'wages' } },
  { tool: 'search_all', args: { query: 'formal sector wages' } },
  { tool: 'search_datasets_catalogue', args: { query: 'wages' } },
  { tool: 'search_datasets_catalogue', args: { query: 'formal sector wages' } },
  { tool: 'search_dashboards', args: { query: 'wages' } },
  { tool: 'list_datasets_catalogue', args: { limit: 3 } },
  { tool: 'filter_datasets_catalogue', args: { geography: ['STATE'], limit: 3 } },
  { tool: 'filter_datasets_catalogue', args: { frequency: 'ANNUAL', yearRange: [2020, 2022], limit: 3 } },
  { tool: 'get_dataset_filters' },
  { tool: 'get_dataset_details', args: { id: 'formal_wages_percentile' } },
  { tool: 'list_dashboards', args: { limit: 3 } },
  { tool: 'get_dashboard_details', args: { name: 'formal_wages' } },
  { tool: 'get_dashboard_charts', args: { name: 'formal_wages' } },
  // OpenDOSM / data.gov.my API
  { tool: 'list_dosm_datasets' },
  { tool: 'list_dosm_datasets', args: { dataset_id: 'cpi_core', limit: 2 } },
  { tool: 'get_dosm_dataset', args: { id: 'formal_wages_percentile', limit: 2 } },
  { tool: 'get_dosm_dataset', args: { id: 'cpi_core', limit: 2, offset: 2 } },
  { tool: 'get_weather_forecast', args: { location: 'Penang', days: 3 } },
  { tool: 'get_weather_forecast', args: { location: 'Kuala Lumpur', days: 3 } },
  { tool: 'get_weather_warnings' },
  { tool: 'get_weather_warnings', args: { type: 'wind' } },
  { tool: 'get_weather_warnings', args: { type: 'wind', location: 'Pahang' } },
  { tool: 'get_earthquake_warnings', args: { days: 30, magnitude: 3 } },
  { tool: 'get_flood_warnings' },
  { tool: 'get_flood_warnings', args: { state: 'Penang', include_normal: true, limit: 3 } },
  { tool: 'get_flood_warnings', args: { severity: 'danger' } },
  { tool: 'list_transport_agencies' },
  { tool: 'get_transport_data', args: { dataset_id: 'ridership_headline', limit: 2 } },
  { tool: 'get_transport_data', args: { dataset_id: 'gtfs_rapidkl', limit: 2 }, expectError: true },
  { tool: 'get_gtfs_static', args: { provider: 'ktmb' } },
  { tool: 'get_gtfs_realtime_vehicle_position', args: { provider: 'prasarana', category: 'rapid-bus-kl' } },
  { tool: 'get_gtfs_realtime_vehicle_position', args: { provider: 'prasarana', category: 'rapid-rail-kl' }, expectError: true },
];

// Parquet files and GTFS transit feeds (these download real files, so they are slower).
const PARQUET_URL = 'https://storage.dosm.gov.my/labour/formal_wages_percentile.parquet';
const EXTRA_CALLS: typeof CALLS = [
  { tool: 'get_parquet_info', args: { url: PARQUET_URL } },
  { tool: 'parse_parquet_file', args: { url: PARQUET_URL, output_mode: 'latest' } },
  { tool: 'parse_parquet_file', args: { url: PARQUET_URL, maxRows: 5 } },
  { tool: 'find_dashboard_for_parquet', args: { url: PARQUET_URL } },
  // A file that feeds a dashboard chart (upstream lists it with http://)
  { tool: 'find_dashboard_for_parquet', args: { url: 'http://storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_percentile.parquet' } },
  { tool: 'get_parquet_info', args: { url: 'http://169.254.169.254/latest/meta-data' }, expectError: true },
  { tool: 'parse_gtfs_static', args: { provider: 'ktmb' } },
  { tool: 'parse_gtfs_static', args: { provider: 'ktmb', file: 'stops', limit: 2 } },
  { tool: 'parse_gtfs_realtime', args: { provider: 'ktmb' } },
  { tool: 'parse_gtfs_realtime', args: { provider: 'rapid penang' } },
  { tool: 'parse_gtfs_realtime', args: { provider: 'rapid kuantan' }, expectError: true },
  { tool: 'get_transit_arrivals', args: { provider: 'ktmb', stop_id: '19100', limit: 3 } },
  { tool: 'get_transit_routes', args: { provider: 'prasarana', category: 'rapid-bus-penang' } },
  // Route filters accept the number on the bus ("401") as well as the internal route_id
  { tool: 'get_transit_routes', args: { provider: 'rapid penang', route_id: '401' } },
  { tool: 'get_transit_routes', args: { provider: 'rapid penang', route_id: '999' }, expectError: true },
  { tool: 'get_transit_stops', args: { provider: 'rapid penang', route_id: '401', limit: 3 } },
  { tool: 'get_transit_arrivals', args: { provider: 'rapid penang', stop_id: '12002116', route_id: '101', limit: 2 } },
  { tool: 'get_transit_stops', args: { provider: 'prasarana', category: 'rapid-rail-kl', route_id: 'KJ' } },
  { tool: 'find_nearest_transit_stops', args: { provider: 'prasarana', category: 'rapid-rail-kl', latitude: 3.1579, longitude: 101.7116, limit: 3 } },
  { tool: 'search_transit_stops_by_location', args: { provider: 'prasarana', category: 'rapid-bus-penang', location: 'Komtar', limit: 3, include_arrivals: true } },
];

const PREFIX = 'datagovmy_';
const CALL_TIMEOUT_MS = 120_000;

/** Classify a tool result: FAIL if it reports an error, EMPTY if it has no rows, else PASS. */
function classify(result: { content?: unknown; isError?: boolean }): { status: string; note: string } {
  const blocks = Array.isArray(result.content) ? (result.content as Array<{ type: string; text?: string }>) : [];
  const text = blocks.map(b => b.text ?? '').join('\n');
  const size = `${text.length.toLocaleString()} chars`;

  if (result.isError) return { status: 'FAIL', note: `isError: ${text.slice(0, 160)}` };
  if (/^\s*error/i.test(text)) return { status: 'FAIL', note: text.slice(0, 160) };

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if ('error' in parsed) {
        return { status: 'FAIL', note: `${parsed.error}: ${parsed.message ?? ''}`.slice(0, 160) };
      }
      if (parsed.success === false) {
        return { status: 'FAIL', note: String(parsed.message ?? 'success: false').slice(0, 160) };
      }
      if (parsed.status_code && parsed.status_code >= 400) {
        return { status: 'FAIL', note: JSON.stringify(parsed).slice(0, 160) };
      }
      // EMPTY only when every list in the result is empty (some results legitimately
      // have an empty list next to a full one, e.g. no dashboards but one dataset)
      const arrays = Object.entries(parsed).filter(([, v]) => Array.isArray(v));
      if (arrays.length > 0 && arrays.every(([, v]) => (v as unknown[]).length === 0)) {
        return { status: 'EMPTY', note: `${arrays.map(([k]) => `"${k}"`).join(', ')} empty (${size})` };
      }
    }
    if (Array.isArray(parsed) && parsed.length === 0) return { status: 'EMPTY', note: `empty array (${size})` };
  } catch {
    // Not JSON: fine, treat as text
  }
  return { status: 'PASS', note: size };
}

async function main() {
  const args = process.argv.slice(2);
  const client = new Client({ name: 'smoke-test', version: '1.0.0' });

  const remoteUrl = args.find(a => a.startsWith('--url='))?.slice('--url='.length);
  if (remoteUrl) {
    // A deployed server, reached over Streamable HTTP exactly as MCP clients reach it
    console.log(`Testing deployed server: ${remoteUrl}`);
    await client.connect(new StreamableHTTPClientTransport(new URL(remoteUrl)));
  } else {
    // The code in this folder, started in-process (loaded only in this mode)
    const { default: createStatelessServer } = await import('../src/index.js');
    const server = createStatelessServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  }

  if (args.includes('--list')) {
    const { tools } = await client.listTools();
    for (const t of tools) {
      const schema = t.inputSchema as { properties?: Record<string, { type?: string; enum?: unknown[] }>; required?: string[] };
      const props = Object.entries(schema.properties ?? {})
        .map(([k, v]) => `${k}${schema.required?.includes(k) ? '*' : ''}:${v.enum ? v.enum.join('|') : v.type ?? '?'}`)
        .join(', ');
      console.log(`${t.name.replace(PREFIX, '')}(${props})`);
    }
    console.log(`\n${tools.length} tools (* = required)`);
    await client.close();
    return;
  }

  const filter = args.find(a => !a.startsWith('--'));
  const calls = [...CALLS, ...EXTRA_CALLS].filter(c => !filter || c.tool.includes(filter));

  let failures = 0;
  for (const { tool, args: toolArgs = {}, expectError = false } of calls) {
    const started = Date.now();
    let status: string;
    let note: string;
    let preview = '';
    try {
      const result = await client.callTool(
        { name: PREFIX + tool, arguments: toolArgs },
        undefined,
        { timeout: CALL_TIMEOUT_MS }
      );
      ({ status, note } = classify(result as { content?: unknown; isError?: boolean }));
      if (args.includes('--show')) {
        const blocks = (result.content ?? []) as Array<{ text?: string }>;
        preview = blocks.map(b => b.text ?? '').join('\n').slice(0, 700);
      }
    } catch (error) {
      status = 'FAIL';
      note = `threw: ${error instanceof Error ? error.message : String(error)}`.slice(0, 160);
    }
    // An expected error is a pass ("OK-ERR"); an expected error that didn't happen is a failure
    if (expectError) {
      status = status === 'FAIL' && !note.startsWith('threw') ? 'OKERR' : 'FAIL';
      if (status === 'FAIL') note = `expected a helpful error, got: ${note}`;
    }
    if (status === 'FAIL') failures++;
    const secs = ((Date.now() - started) / 1000).toFixed(1).padStart(5);
    console.log(`${status.padEnd(5)} ${secs}s  ${tool} ${JSON.stringify(toolArgs)}  ->  ${note}`);
    if (preview) console.log(`${preview}\n${'-'.repeat(60)}`);
  }

  console.log(`\n${calls.length} calls, ${failures} failed`);
  await client.close();
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
