#!/usr/bin/env node
// compare-skills.mjs — Diff current vs target skill state
// Usage: node compare-skills.mjs <skill-dir>
// Output: JSON with comparison results

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const skillDir = process.argv[2];
if (!skillDir) {
  console.error('Usage: node compare-skills.mjs <skill-dir>');
  process.exit(1);
}

// Check if skill exists
if (!existsSync(skillDir)) {
  console.error(`Skill not found: ${skillDir}`);
  process.exit(1);
}

// Read SKILL.md
const skillFile = join(skillDir, 'SKILL.md');
if (!existsSync(skillFile)) {
  console.error(`SKILL.md not found: ${skillFile}`);
  process.exit(1);
}

const skillContent = readFileSync(skillFile, 'utf-8');

// Extract frontmatter
const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
let frontmatter = {};
if (frontmatterMatch) {
  const lines = frontmatterMatch[1].split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      frontmatter[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

// Count lines
const lineCount = skillContent.split('\n').length;

// List files
const files = [];
function listFiles(dir, prefix = '') {
  const items = readdirSync(dir);
  for (const item of items) {
    const path = join(dir, item);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      listFiles(path, prefix + item + '/');
    } else {
      files.push(prefix + item);
    }
  }
}
listFiles(skillDir);

// Extract sections
const sections = [];
const sectionRegex = /^## (.+)$/gm;
let match;
while ((match = sectionRegex.exec(skillContent)) !== null) {
  sections.push(match[1]);
}

// Output JSON
const result = {
  skillDir,
  skillName: frontmatter.name || basename(skillDir),
  version: frontmatter.version || '0.0.0',
  description: frontmatter.description || '',
  lineCount,
  fileCount: files.length,
  files,
  sections,
  hasScripts: files.some(f => f.startsWith('scripts/')),
  hasReferences: files.some(f => f.startsWith('references/')),
  hasAssets: files.some(f => f.startsWith('assets/')),
  hasEvals: files.some(f => f.startsWith('evals/'))
};

console.log(JSON.stringify(result, null, 2));
