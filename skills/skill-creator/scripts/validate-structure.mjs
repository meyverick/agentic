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

// Check description field
const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
const desc = descMatch ? descMatch[1].replace(/"/g, '').trim() : '';

if (!desc) {
  errors.push("Missing required 'description' field in frontmatter");
} else if (desc.length > 1024) {
  errors.push(`Description too long: ${desc.length} chars. Maximum 1024 characters.`);
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
