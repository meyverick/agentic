#!/usr/bin/env node
/**
 * validate-structure.mjs — Check skill directory structure and SKILL.md compliance
 * Usage: node validate-structure.mjs <skill-dir>
 * Output: JSON with pass/fail and specifics
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

const errors = [];
const warnings = [];

// Check SKILL.md exists
if (!existsSync(join(skillDir, 'SKILL.md'))) {
  console.log(JSON.stringify({
    pass: false,
    errors: ['SKILL.md not found'],
    warnings: []
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
  errors.push('No frontmatter found in SKILL.md');
}

// Check name field
const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
const name = nameMatch ? nameMatch[1].replace(/"/g, '').trim() : '';

if (!name) {
  errors.push("Missing required 'name' field in frontmatter");
} else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
  errors.push(`Invalid name format: '${name}'. Must be lowercase letters, numbers, hyphens only. No leading/trailing hyphens.`);
} else if (name.length > 64) {
  errors.push(`Name too long: ${name.length} chars. Maximum 64 characters.`);
} else if (name.includes('--')) {
  errors.push(`Name contains consecutive hyphens: '${name}'`);
}

// Check name matches directory
const dirName = basename(skillDir);
if (name && name !== dirName) {
  warnings.push(`Name '${name}' does not match directory name '${dirName}'. Pi allows this, but the Agent Skills standard requires matching.`);
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
  errors.push("Missing required 'description' field in frontmatter");
} else if (desc.length > 1024) {
  errors.push(`Description too long: ${desc.length} chars. Maximum 1024 characters.`);
}

// NEW: Check description contains "Use when" phrasing
if (desc && !/use when/i.test(desc)) {
  warnings.push("Description should contain 'Use when' phrasing for imperative intent");
}

// NEW: Check description contains "Do NOT use when" phrasing
if (desc && !/do not use when|don't use when/i.test(desc)) {
  warnings.push("Description should contain 'Do NOT use when' phrasing for negative scope");
}

// NEW: Check for compound intent markers in description
if (desc) {
  const compoundMarkers = /\b(and also\b|\badditionally\b|\bas well as\b)/i;
  if (compoundMarkers.test(desc)) {
    warnings.push("Description may contain compound intent (multiple operations). Consider splitting into separate skills.");
  }
}

// NEW: Check positive_triggers array (min 3 entries)
const ptMatch = frontmatter.match(/^positive_triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
if (ptMatch) {
  const triggers = ptMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
  if (triggers.length < 3) {
    warnings.push(`positive_triggers has ${triggers.length} entries. Minimum 3 recommended for routing accuracy.`);
  }
} else {
  warnings.push("Missing 'positive_triggers' array in frontmatter. Recommended minimum 3 entries for semantic routing.");
}

// NEW: Check anti_triggers array (min 2 entries)
const atMatch = frontmatter.match(/^anti_triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
if (atMatch) {
  const triggers = atMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
  if (triggers.length < 2) {
    warnings.push(`anti_triggers has ${triggers.length} entries. Minimum 2 recommended for precision (+31.8%).`);
  }
} else {
  warnings.push("Missing 'anti_triggers' array in frontmatter. Anti-triggers boost routing precision by 31.8%.");
}

// NEW: Check runtime field present when scripts exist
const scriptsDir = join(skillDir, 'scripts');
if (existsSync(scriptsDir)) {
  const scriptFiles = readdirSync(scriptsDir).filter(f => f.endsWith('.mjs') || f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.sh'));
  if (scriptFiles.length > 0) {
    if (!frontmatter.includes('runtime:') && !frontmatter.includes('timeout_seconds')) {
      warnings.push('Scripts exist but no runtime contract declared in frontmatter (runtime:, timeout_seconds:)');
    }
  }
}

// NEW: Check for hardcoded absolute paths in script files
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
        errors.push(`Hardcoded absolute path detected in scripts/${file}. Use relative paths resolved via import.meta.url.`);
        break;
      }
    }
    // Check for harness-specific directories
    if (/\.pi\/skills\/|\.agents\/skills\//.test(content)) {
      errors.push(`Harness-specific directory reference detected in scripts/${file}. Scripts must be portable across harnesses.`);
    }
  }
}

// Check directory structure
if (!existsSync(join(skillDir, 'scripts'))) {
  warnings.push('Missing scripts/ directory');
}

if (!existsSync(join(skillDir, 'references'))) {
  warnings.push('Missing references/ directory');
}

if (!existsSync(join(skillDir, 'assets'))) {
  warnings.push('Missing assets/ directory');
}

// Check file references in SKILL.md resolve
const lines = skillMd.split('\n');
for (const line of lines) {
  const refMatch = line.match(/\]\(([^)]+)\)/);
  if (refMatch) {
    const ref = refMatch[1];
    if (ref && !ref.startsWith('http') && !ref.startsWith('#') && !ref.startsWith('mailto:')) {
      if (!existsSync(join(skillDir, ref))) {
        warnings.push(`File reference not found: ${ref}`);
      }
    }
  }
}

// Build result
console.log(JSON.stringify({
  pass: errors.length === 0,
  name: name,
  description_length: desc.length,
  errors: errors,
  warnings: warnings
}));
