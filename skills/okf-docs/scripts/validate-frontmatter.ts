#!/usr/bin/env bun
/**
 * validate-frontmatter.ts — OKF v0.2 frontmatter gate
 * Usage: bun validate-frontmatter.ts <document.md>
 * Output: unified JSON envelope {target, pass, checks:[{id,status,detail}], summary}
 *
 * Checks: required keys (type/generated.by/at) · ISO 8601 formats · actor
 * convention values · status enum · stale_after chronology.
 */

import { readFileSync, existsSync } from 'node:fs';

type CheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

interface CheckEntry {
  id: string;
  status: CheckStatus;
  detail: string;
}

interface ValidationSummary {
  total: number;
  pass: number;
  fail: number;
  warn: number;
  skip: number;
}

interface ValidationReport {
  target: string;
  pass: boolean;
  checks: CheckEntry[];
  summary: ValidationSummary;
}

const docPath = process.argv[2];

if (!docPath || docPath === '-h' || docPath === '--help') {
  if (docPath === '-h' || docPath === '--help') {
    console.log('Usage: bun validate-frontmatter.ts <document.md>');
    process.exit(0);
  }
  console.error(JSON.stringify({ error: 'Usage: bun validate-frontmatter.ts <document.md>' }));
  process.exit(2);
}

if (!existsSync(docPath)) {
  const report: ValidationReport = {
    target: docPath,
    pass: false,
    checks: [{ id: 'okf.file', status: 'FAIL', detail: 'Document not found' }],
    summary: { total: 1, pass: 0, fail: 1, warn: 0, skip: 0 }
  };
  console.log(JSON.stringify(report));
  process.exit(1);
}

const content = readFileSync(docPath, 'utf-8');
const checks: CheckEntry[] = [];

const add = (id: string, ok: boolean, detail: string): void => {
  checks.push({ id, status: ok ? 'PASS' : 'FAIL', detail });
};
const warn = (id: string, detail: string): void => {
  checks.push({ id, status: 'WARN', detail });
};

// Extract frontmatter
const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  const report: ValidationReport = {
    target: docPath,
    pass: false,
    checks: [{ id: 'okf.frontmatter', status: 'FAIL', detail: 'No frontmatter block found' }],
    summary: { total: 1, pass: 0, fail: 1, warn: 0, skip: 0 }
  };
  console.log(JSON.stringify(report));
  process.exit(1);
}
add('okf.frontmatter', true, 'Frontmatter block present');

// Parse simple YAML subset (top-level + one nested level for generated)
const fm = fmMatch[1];
function get(key: string): string | null {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
function getNested(parent: string, key: string): string | null {
  const m = fm.match(new RegExp(`^${parent}:\\s*\\{\\s*([^}]*)\\}`, 'm'));
  if (!m) return null;
  const inner = m[1].match(new RegExp(`${key}:\\s*([^,}]+)`));
  return inner ? inner[1].trim() : null;
}

// type (FAIL if missing/empty)
const type = get('type');
add('okf.type', !!type, type ? `type = ${type}` : "Missing required 'type'");

// generated.by + at (FAIL if missing; actor convention + ISO for at)
const by = getNested('generated', 'by');
const at = getNested('generated', 'at');
add('okf.generated-by', !!by, by ? `generated.by = ${by}` : "Missing required 'generated.by'");

const actorRe = /^([a-z0-9][a-z0-9-]*\/\d+(\.\d+)*|human:[a-z0-9-]+|process:[a-z0-9-]+)$/;
add(
  'okf.actor-convention',
  !!by && actorRe.test(by),
  by
    ? actorRe.test(by)
      ? `Actor '${by}' matches convention`
      : `Actor '${by}' violates convention (<producer>/<version> | human:<id> | process:<id>)`
    : 'No actor to check'
);

const isoRe = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/;
add(
  'okf.generated-at-format',
  !!at && isoRe.test(at),
  at ? (isoRe.test(at) ? `generated.at = ${at}` : `'${at}' is not ISO 8601`) : "Missing required 'generated.at'"
);

// sources (WARN if missing — recommended not mandatory)
const hasSources = /^sources:/m.test(fm);
if (!hasSources) warn('okf.sources', "Missing 'sources:' list — claims uncited (recommended)");

// status enum (FAIL on invalid value, WARN if missing)
const status = get('status');
if (!status) {
  warn('okf.status', "Missing 'status' (draft | stable | deprecated)");
} else if (!['draft', 'stable', 'deprecated'].includes(status)) {
  add('okf.status', false, `Invalid status '${status}' — must be draft | stable | deprecated`);
} else {
  add('okf.status', true, `status = ${status}`);
}

// stale_after chronology vs generated.at
const stale = get('stale_after');
if (stale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stale)) {
    add('okf.stale-after', false, `stale_after '${stale}' is not YYYY-MM-DD`);
  } else if (at) {
    const genDay = at.slice(0, 10);
    add(
      'okf.stale-after',
      stale >= genDay,
      stale >= genDay ? `stale_after ${stale} ≥ generated ${genDay}` : `stale_after ${stale} predates generation ${genDay}`
    );
  } else {
    add('okf.stale-after', true, `stale_after = ${stale} (no generated.at to compare)`);
  }
} else {
  warn('okf.stale-after', 'No stale_after set (fine for non-time-sensitive docs)');
}

// Unified envelope
const fails = checks.filter((c) => c.status === 'FAIL').length;
const report: ValidationReport = {
  target: docPath,
  pass: fails === 0,
  checks,
  summary: {
    total: checks.length,
    pass: checks.filter((c) => c.status === 'PASS').length,
    fail: fails,
    warn: checks.filter((c) => c.status === 'WARN').length,
    skip: checks.filter((c) => c.status === 'SKIP').length
  }
};

console.log(JSON.stringify(report));
process.exit(fails > 0 ? 1 : 0);
