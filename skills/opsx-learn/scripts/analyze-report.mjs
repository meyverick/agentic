#!/usr/bin/env node
// analyze-report.mjs — Extract insights from a report
// Usage: node analyze-report.mjs <report-dir>
// Output: JSON with extracted insights

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const reportDir = process.argv[2];
if (!reportDir) {
  console.error('Usage: node analyze-report.mjs <report-dir>');
  process.exit(1);
}

const reportFile = join(reportDir, 'report.md');
if (!existsSync(reportFile)) {
  console.error(`Report not found: ${reportFile}`);
  process.exit(1);
}

const content = readFileSync(reportFile, 'utf-8');

// Extract frontmatter
const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
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

// Extract sections
const sections = {};
const sectionRegex = /^## (.+)$/gm;
let match;
while ((match = sectionRegex.exec(content)) !== null) {
  const sectionName = match[1];
  const startIdx = match.index + match[0].length;
  const nextSection = content.indexOf('\n## ', startIdx);
  const endIdx = nextSection === -1 ? content.length : nextSection;
  sections[sectionName] = content.slice(startIdx, endIdx).trim();
}

// Extract tags
const tags = frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : [];

// Extract skill name from tags or title
let skillName = null;
if (frontmatter.title) {
  const titleMatch = frontmatter.title.match(/Report:\s*(.+)/);
  if (titleMatch) {
    skillName = titleMatch[1].trim();
  }
}

// Extract follow-ups
const followups = [];
if (sections['Follow-ups']) {
  const followupLines = sections['Follow-ups'].split('\n').filter(l => l.startsWith('- [ ]'));
  followups.push(...followupLines.map(l => l.replace('- [ ] ', '')));
}

// Extract validation results
let validation = null;
if (sections['Validation']) {
  validation = {
    hasTests: sections['Validation'].includes('test'),
    hasPassFail: sections['Validation'].includes('PASS') || sections['Validation'].includes('FAIL'),
    content: sections['Validation']
  };
}

// Output JSON
const result = {
  frontmatter,
  sections: Object.keys(sections),
  skillName,
  tags,
  followups,
  validation,
  hasProposal: !!sections['Problem Statement'] || !!sections['Why'],
  hasDesign: !!sections['Approach'] || !!sections['Key Decisions'],
  hasSpecs: !!sections['What Changed'],
  hasImplementation: !!sections['Implementation'],
  hasTradeoffs: !!sections['Trade-offs']
};

console.log(JSON.stringify(result, null, 2));
