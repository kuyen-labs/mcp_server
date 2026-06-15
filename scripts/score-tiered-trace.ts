import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { scoreTieredBoostToolTrace, summarizeRubric, type ToolCallTrace } from '../src/eval/tiered-boost-rubric.js';

const EXAMPLE_TRACE = 'docs/mcp-phase2/fixtures/example-good-trace.json';

function main(): void {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error(`Usage: npm run eval:score-trace -- <path-to-trace.json>`);
    console.error(`Example: npm run eval:score-trace -- ${EXAMPLE_TRACE}`);
    process.exit(1);
  }

  const tracePath = resolve(fileArg);
  if (!existsSync(tracePath)) {
    console.error(`Trace file not found: ${tracePath}`);
    console.error('Export tool calls from your MCP session to a JSON array, or try the bundled example:');
    console.error(`  npm run eval:score-trace -- ${EXAMPLE_TRACE}`);
    process.exit(1);
  }

  const raw = readFileSync(tracePath, 'utf8');
  const calls = JSON.parse(raw) as ToolCallTrace[];
  const results = scoreTieredBoostToolTrace(calls);
  const summary = summarizeRubric(results);

  for (const row of results) {
    const icon = row.verdict === 'pass' ? '✓' : row.verdict === 'fail' ? '✗' : '?';
    console.log(`${icon} [${row.id}] ${row.label}`);
    console.log(`    ${row.detail}`);
  }

  console.log('');
  console.log(`Summary: ${summary.pass} pass, ${summary.fail} fail, ${summary.manual} manual review`);

  if (!summary.automatablePass) {
    process.exit(1);
  }
}

main();
