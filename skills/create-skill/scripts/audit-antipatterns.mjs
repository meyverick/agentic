#!/usr/bin/env node
/**
 * audit-antipatterns.mjs — Check skill for known antipatterns
 * Usage: node audit-antipatterns.mjs <skill-dir>
 * Output: unified JSON envelope {target, pass, checks:[{id,status,detail}], summary}
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const skillDir = process.argv[2];

if (!skillDir) {
  console.error(JSON.stringify({
    error: 'Usage: node audit-antipatterns.mjs <skill-dir>'
  }));
  process.exit(1);
}

const skillFile = join(skillDir, 'SKILL.md');

if (!existsSync(skillFile)) {
  console.log(JSON.stringify({
    target: skillDir,
    pass: false,
    checks: [{ id: 'antipatterns.skill-file', status: 'FAIL', detail: 'SKILL.md not found' }],
    summary: { total: 1, pass: 0, fail: 1, warn: 0, skip: 0 }
  }));
  process.exit(1);
}

const skillMd = readFileSync(skillFile, 'utf-8');
const lines = skillMd.split('\n');
const violations = [];

// Check each line for antipatterns
lines.forEach((line, index) => {
  const lineNum = index + 1;

  // A15: Vague success bars
  if (/professional|high.quality|well.written|good.output|proper.format/i.test(line)) {
    violations.push({
      line: lineNum,
      pattern: 'A15',
      severity: 'WARN',
      description: `Vague success bar: '${line.slice(0, 80)}'`
    });
  }

  // A3: Passive-voice triggers
  if (/^(you are|your role|as a|acting as)/i.test(line)) {
    violations.push({
      line: lineNum,
      pattern: 'A3',
      severity: 'WARN',
      description: `Passive-voice trigger: '${line.slice(0, 80)}'`
    });
  }

  // A5: Prose bloat
  if (/;.*;.*;|(\|.*\|.*\|)/.test(line)) {
    violations.push({
      line: lineNum,
      pattern: 'A5',
      severity: 'WARN',
      description: `Possible prose bloat: '${line.slice(0, 80)}'`
    });
  }

  // A1: Phantom tool reference
  if (/(call|invoke|execute|use)\s+[a-z_]+\.[a-z_]+/i.test(line)) {
    violations.push({
      line: lineNum,
      pattern: 'A1',
      severity: 'WARN',
      description: `Possible phantom tool reference: '${line.slice(0, 80)}'`
    });
  }
});

// A14: Single file omnibus (>500 lines)
if (lines.length > 500) {
  violations.push({
    line: lines.length,
    pattern: 'A14',
    severity: 'FAIL',
    description: `Single file omnibus: ${lines.length} lines (max 500)`
  });
}

// A2: Duplicated invariants (exact duplicate lines)
const seen = new Set();
const duplicates = new Set();
lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
    if (seen.has(trimmed)) {
      duplicates.add(trimmed);
    }
    seen.add(trimmed);
  }
});

[...duplicates].slice(0, 5).forEach(dup => {
  violations.push({
    line: 0,
    pattern: 'A2',
    severity: 'WARN',
    description: `Duplicated invariant: '${dup.slice(0, 80)}'`
  });
});

// A4: Copy-pasted cheat-sheet (repeated headings)
const headingCounts = {};
lines.forEach(line => {
  if (line.startsWith('## ')) {
    const heading = line.slice(3).trim();
    headingCounts[heading] = (headingCounts[heading] || 0) + 1;
  }
});

Object.entries(headingCounts).forEach(([heading, count]) => {
  if (count > 1) {
    violations.push({
      line: 0,
      pattern: 'A4',
      severity: 'WARN',
      description: `Possible copy-pasted section: '${heading}'`
    });
  }
});

// Unified envelope — one check entry per pattern, aggregated when >10 hits
const byPattern = {};
for (const v of violations) {
  if (!byPattern[v.pattern]) byPattern[v.pattern] = [];
  byPattern[v.pattern].push(v);
}

const checks = Object.entries(byPattern).map(([pattern, vs]) => {
  const worst = vs.some(v => v.severity === 'FAIL') ? 'FAIL' : 'WARN';
  let detail;
  if (vs.length > 10) {
    detail = `${vs.length} occurrences of ${pattern} (aggregated): ${vs.slice(0, 3).map(v => v.description).join(' | ')}`;
  } else {
    detail = vs.map(v => `${v.pattern} @${v.line}: ${v.description}`).join(' | ');
  }
  return { id: `antipatterns.${pattern}`, status: worst, detail };
});

console.log(JSON.stringify({
  target: skillDir,
  pass: checks.every(c => c.status !== 'FAIL'),
  total_lines: lines.length,
  violation_count: violations.length,
  checks,
  summary: {
    total: checks.length,
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    warn: checks.filter(c => c.status === 'WARN').length,
    skip: checks.filter(c => c.status === 'SKIP').length
  }
}));
