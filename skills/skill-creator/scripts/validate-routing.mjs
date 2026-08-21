#!/usr/bin/env node
/**
 * validate-routing.mjs — Semantic routing validation for skills
 * Usage: node validate-routing.mjs <skill-dir>
 * Output: JSON with routing validation results
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const skillDir = process.argv[2];

if (!skillDir) {
  console.error(JSON.stringify({
    error: 'Usage: node validate-routing.mjs <skill-dir>'
  }));
  process.exit(1);
}

const skillFile = join(skillDir, 'SKILL.md');

if (!existsSync(skillFile)) {
  console.log(JSON.stringify({
    error: 'SKILL.md not found',
    checks: []
  }));
  process.exit(1);
}

const skillMd = readFileSync(skillFile, 'utf-8');
const checks = [];

// Extract frontmatter
const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';

// Extract body (everything after frontmatter)
const bodyStart = skillMd.indexOf('---', 3);
const body = bodyStart !== -1 ? skillMd.slice(bodyStart + 3) : skillMd;

// Extract description
const descMatch = frontmatter.match(/^description:\s*([\s\S]*?)(?=\n\w+:|\n---)/m);
const description = descMatch ? descMatch[1].replace(/^>\s*\n?/, '').trim() : '';

// CHECK 1: positive_triggers coverage (min 3 entries)
const ptMatch = frontmatter.match(/^positive_triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
let ptCount = 0;
if (ptMatch) {
  const triggers = ptMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
  ptCount = triggers.length;
}
checks.push({
  check: 'positive_triggers_coverage',
  passed: ptCount >= 3,
  detail: `${ptCount} entries found (minimum 3 required)`,
  impact: 'Positive triggers improve semantic routing accuracy'
});

// CHECK 2: anti_triggers coverage (min 2 entries)
const atMatch = frontmatter.match(/^anti_triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
let atCount = 0;
if (atMatch) {
  const triggers = atMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
  atCount = triggers.length;
}
checks.push({
  check: 'anti_triggers_coverage',
  passed: atCount >= 2,
  detail: `${atCount} entries found (minimum 2 required)`,
  impact: 'Anti-triggers boost routing precision by 31.8%'
});

// CHECK 3: Description contains "Use when" phrasing
const hasUseWhen = /use when/i.test(description);
checks.push({
  check: 'description_use_when',
  passed: hasUseWhen,
  detail: hasUseWhen ? 'Found "Use when" phrasing' : 'Missing "Use when" phrasing in description',
  impact: 'Imperative phrasing helps agents decide when to activate'
});

// CHECK 4: Description contains "Do NOT use when" phrasing
const hasNotUse = /do not use when|don't use when/i.test(description);
checks.push({
  check: 'description_negative_scope',
  passed: hasNotUse,
  detail: hasNotUse ? 'Found "Do NOT use when" phrasing' : 'Missing negative scope in description',
  impact: 'Negative scope prevents over-firing on similar-domain queries'
});

// CHECK 5: Description-body alignment (keywords in description appear in body)
let alignmentScore = 0;
let alignmentTotal = 0;
if (description) {
  // Extract significant words from description (>3 chars, not common words)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'when', 'not', 'use', 'from', 'are', 'was', 'have', 'has', 'will', 'can', 'should', 'does', 'its']);
  const words = description.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  const uniqueWords = [...new Set(words)];
  alignmentTotal = Math.min(uniqueWords.length, 10); // Check top 10 keywords
  
  for (const word of uniqueWords.slice(0, 10)) {
    if (body.toLowerCase().includes(word)) {
      alignmentScore++;
    }
  }
}

const alignmentRatio = alignmentTotal > 0 ? alignmentScore / alignmentTotal : 0;
checks.push({
  check: 'description_body_alignment',
  passed: alignmentRatio >= 0.5,
  detail: `${alignmentScore}/${alignmentTotal} description keywords found in body (${Math.round(alignmentRatio * 100)}% alignment)`,
  impact: 'Frontmatter-only indexing loses 29-44% recall. Body must contain description keywords.'
});

// CHECK 6: Single-responsibility verification
let singleResponsibility = true;
let srDetail = 'Single atomic intent detected';
if (description) {
  const compoundMarkers = /\b(and also\b|\badditionally\b|\bas well as\b)/i;
  if (compoundMarkers.test(description)) {
    singleResponsibility = false;
    srDetail = 'Compound intent detected. Description contains multiple operations joined by "and also" or "additionally".';
  }
  
  // Check for multiple distinct action verbs
  const actionVerbs = description.match(/\b(?:create|delete|update|modify|analyze|generate|process|manage|handle|configure|deploy|monitor)\b/gi);
  if (actionVerbs && new Set(actionVerbs.map(v => v.toLowerCase())).size > 2) {
    singleResponsibility = false;
    srDetail = `Multiple distinct action verbs detected (${[...new Set(actionVerbs.map(v => v.toLowerCase()))].join(', ')}). Consider splitting into separate skills.`;
  }
}
checks.push({
  check: 'single_responsibility',
  passed: singleResponsibility,
  detail: srDetail,
  impact: 'Multi-domain descriptions cause trigger dilution and reduce routing confidence'
});

// Build result
const passCount = checks.filter(c => c.passed).length;
console.log(JSON.stringify({
  pass: passCount === checks.length,
  total_checks: checks.length,
  passed_checks: passCount,
  failed_checks: checks.length - passCount,
  checks: checks
}));
