#!/usr/bin/env node
/**
 * validate-structure.mjs — Check skill directory structure and SKILL.md compliance
 * Usage: node validate-structure.mjs <skill-dir>
 * Output: unified JSON envelope {target, pass, checks:[{id,status,detail}], summary}
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const skillDir = process.argv[2];

if (!skillDir) {
  console.error(JSON.stringify({
    error: 'Usage: node validate-structure.mjs <skill-dir>'
  }));
  process.exit(1);
}

const checks = [];

function add(id, severity, detail) {
  checks.push({ id, status: severity, detail });
}
const fail = (id, detail) => add(id, 'FAIL', detail);
const warn = (id, detail) => add(id, 'WARN', detail);
const pass = (id, detail) => add(id, 'PASS', detail);

// Check SKILL.md exists
if (!existsSync(join(skillDir, 'SKILL.md'))) {
  console.log(JSON.stringify({
    target: skillDir,
    pass: false,
    checks: [{ id: 'structure.skill-file', status: 'FAIL', detail: 'SKILL.md not found' }],
    summary: { total: 1, pass: 0, fail: 1, warn: 0, skip: 0 }
  }));
  process.exit(1);
}

// Read SKILL.md
const skillMd = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');

// Extract frontmatter
const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
let frontmatter = '';

if (frontmatterMatch) {
  frontmatter = frontmatterMatch[1];
} else {
  fail('structure.frontmatter', 'No frontmatter found in SKILL.md');
}

// Check name field
const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
const name = nameMatch ? nameMatch[1].replace(/"/g, '').trim() : '';

if (!name) {
  fail('structure.name', "Missing required 'name' field in frontmatter");
} else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
  fail('structure.name', `Invalid name format: '${name}'. Must be lowercase letters, numbers, hyphens only. No leading/trailing hyphens.`);
} else if (name.length > 64) {
  fail('structure.name', `Name too long: ${name.length} chars. Maximum 64 characters.`);
} else if (name.includes('--')) {
  fail('structure.name', `Name contains consecutive hyphens: '${name}'`);
} else {
  pass('structure.name', `Valid name: '${name}'`);
}

// Check name matches directory
const dirName = basename(skillDir);
if (name && name !== dirName) {
  warn('structure.name-dir-match', `Name '${name}' does not match directory name '${dirName}'. Pi allows this, but the Agent Skills standard requires matching.`);
}

// Check description field (handles both single-line and multi-line YAML)
let desc = '';
let descStarted = false;
for (const fmLine of frontmatter.split('\n')) {
  if (fmLine.startsWith('description:')) {
    descStarted = true;
    const inline = fmLine.replace(/^description:\s*>?-?\s*/, '');
    if (inline.trim()) desc = inline.trim();
    continue;
  }
  if (descStarted) {
    if (/^[a-zA-Z_-]+\s*:/.test(fmLine) || fmLine.startsWith('---')) {
      break;
    }
    const trimmed = fmLine.trim();
    if (trimmed) {
      desc = desc ? desc + ' ' + trimmed : trimmed;
    }
  }
}

if (!desc) {
  fail('structure.description', "Missing required 'description' field in frontmatter");
} else if (desc.length > 1024) {
  fail('structure.description', `Description too long: ${desc.length} chars. Maximum 1024 characters.`);
} else {
  pass('structure.description', `${desc.length} chars, within limit`);
}

// Description phrasing warnings
if (desc && !/use when/i.test(desc)) {
  warn('structure.use-when', "Description should contain 'Use when' phrasing for imperative intent");
}

if (desc && !/do not use when|don't use when/i.test(desc)) {
  warn('structure.negative-scope', "Description should contain 'Do NOT use when' phrasing for negative scope");
}

if (desc) {
  const compoundMarkers = /\b(and also\b|\badditionally\b|\bas well as\b)/i;
  if (compoundMarkers.test(desc)) {
    warn('structure.compound-intent', "Description may contain compound intent (multiple operations). Consider splitting into separate skills.");
  }
}

// positive_triggers array (min 3 entries)
const ptMatch = frontmatter.match(/^positive_triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
if (ptMatch) {
  const triggers = ptMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
  if (triggers.length < 3) {
    warn('structure.positive-triggers', `positive_triggers has ${triggers.length} entries. Minimum 3 recommended for routing accuracy.`);
  } else {
    pass('structure.positive-triggers', `${triggers.length} entries`);
  }
} else {
  warn('structure.positive-triggers', "Missing 'positive_triggers' array in frontmatter. Recommended minimum 3 entries for semantic routing.");
}

// anti_triggers array (min 2 entries)
const atMatch = frontmatter.match(/^anti_triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
if (atMatch) {
  const triggers = atMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
  if (triggers.length < 2) {
    warn('structure.anti-triggers', `anti_triggers has ${triggers.length} entries. Minimum 2 recommended for precision (+31.8%).`);
  } else {
    pass('structure.anti-triggers', `${triggers.length} entries`);
  }
} else {
  warn('structure.anti-triggers', "Missing 'anti_triggers' array in frontmatter. Anti-triggers boost routing precision by 31.8%.");
}

// Runtime contract when scripts exist
const scriptsDir = join(skillDir, 'scripts');
if (existsSync(scriptsDir)) {
  const scriptFiles = readdirSync(scriptsDir).filter(f => f.endsWith('.mjs') || f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.sh'));
  if (scriptFiles.length > 0) {
    if (!frontmatter.includes('runtime:') && !frontmatter.includes('timeout_seconds')) {
      warn('structure.runtime-contract', 'Scripts exist but no runtime contract declared in frontmatter (runtime:, timeout_seconds:)');
    } else {
      pass('structure.runtime-contract', 'Runtime contract declared for bundled scripts');
    }
  }
}

// Hardcoded absolute paths in script files
if (existsSync(scriptsDir)) {
  const scriptFiles = readdirSync(scriptsDir).filter(f => f.endsWith('.mjs') || f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.sh'));
  for (const file of scriptFiles) {
    const content = readFileSync(join(scriptsDir, file), 'utf-8');
    const absPathPatterns = [
      /['"]\/home\//,
      /['"]\/root\//,
      /['"]\/usr\/(?!local\/bin)(?!share)/,
      /['"]C:\\\\/
    ];
    for (const pattern of absPathPatterns) {
      if (pattern.test(content)) {
        fail(`structure.portability.${file}`, `Hardcoded absolute path detected in scripts/${file}. Use relative paths resolved via import.meta.url.`);
        break;
      }
    }
    if (/\.pi\/skills\/|\.agents\/skills\//.test(content)) {
      fail(`structure.portability.${file}`, `Harness-specific directory reference detected in scripts/${file}. Scripts must be portable across harnesses.`);
    }
  }
  if (!checks.some(c => c.id.startsWith('structure.portability.') && c.status === 'FAIL') && scriptFiles.length > 0) {
    pass('structure.portability', 'No hardcoded/harness-specific paths in scripts');
  }
}

// Directory structure conventions
for (const dir of ['scripts', 'references', 'assets']) {
  if (!existsSync(join(skillDir, dir))) {
    warn(`structure.dir-${dir}`, `Missing ${dir}/ directory`);
  } else {
    pass(`structure.dir-${dir}`, `${dir}/ present`);
  }
}

// File references in SKILL.md resolve
const lines = skillMd.split('\n');
for (const line of lines) {
  const refMatch = line.match(/\]\(([^)]+)\)/);
  if (refMatch) {
    const ref = refMatch[1];
    if (ref && !ref.startsWith('http') && !ref.startsWith('#') && !ref.startsWith('mailto:')) {
      if (!existsSync(join(skillDir, ref))) {
        warn(`structure.reference`, `File reference not found: ${ref}`);
      }
    }
  }
}

// Unified envelope
const fails = checks.filter(c => c.status === 'FAIL').length;
console.log(JSON.stringify({
  target: skillDir,
  pass: fails === 0,
  name,
  description_length: desc.length,
  checks,
  summary: {
    total: checks.length,
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: fails,
    warn: checks.filter(c => c.status === 'WARN').length,
    skip: checks.filter(c => c.status === 'SKIP').length
  }
}));
