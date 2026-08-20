#!/usr/bin/env node
// measure-quality.mjs — Run quality metrics, calculate delta
// Usage: node measure-quality.mjs <skill-dir>
// Output: JSON with quality score and metrics

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const skillDir = process.argv[2];
if (!skillDir) {
  console.error('Usage: node measure-quality.mjs <skill-dir>');
  process.exit(1);
}

const scriptsDir = join(import.meta.dirname, '../../skill-creator/scripts');

// Initialize scores
let structuralScore = 0;
let antipatternScore = 0;
let contentScore = 0;
let fragilityScore = 0;

// 1. Structural validation
try {
  const validateScript = join(scriptsDir, 'validate-structure.sh');
  if (existsSync(validateScript)) {
    const result = execSync(`bash "${validateScript}" "${skillDir}"`, { encoding: 'utf-8' });
    const data = JSON.parse(result);
    if (data.pass) {
      structuralScore = 30;
    } else {
      // Partial credit for errors
      structuralScore = Math.max(0, 30 - (data.errors?.length || 0) * 5);
    }
  }
} catch (e) {
  // Script failed, score 0
}

// 2. Antipattern audit
try {
  const auditScript = join(scriptsDir, 'audit-antipatterns.sh');
  if (existsSync(auditScript)) {
    const result = execSync(`bash "${auditScript}" "${skillDir}"`, { encoding: 'utf-8' });
    const data = JSON.parse(result);
    if (data.pass) {
      antipatternScore = 15;
    } else {
      // Partial credit based on violation count
      antipatternScore = Math.max(0, 15 - (data.violation_count || 0) * 2);
    }
  }
} catch (e) {
  // Script failed, score 0
}

// 3. Content review (heuristic)
const skillFile = join(skillDir, 'SKILL.md');
if (existsSync(skillFile)) {
  const content = readFileSync(skillFile, 'utf-8');
  
  // Description quality (10 points)
  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    const desc = descMatch[1].toLowerCase();
    if (desc.includes('use when') || desc.includes('use this')) {
      contentScore += 10; // Imperative
    } else if (desc.length > 50) {
      contentScore += 7; // Decent length
    } else {
      contentScore += 3; // Short
    }
  }
  
  // Instruction clarity (10 points)
  const hasSteps = content.includes('## Steps') || content.includes('## Workflow') || content.includes('## Usage');
  const hasExamples = content.includes('```') || content.includes('Example');
  if (hasSteps) contentScore += 5;
  if (hasExamples) contentScore += 5;
  
  // Progressive disclosure (5 points)
  const lineCount = content.split('\n').length;
  if (lineCount < 500) contentScore += 5;
  else if (lineCount < 700) contentScore += 3;
  
  // Gotchas present (5 points)
  if (content.includes('## Gotchas') || content.includes('## Pitfalls')) {
    contentScore += 5;
  }
}

// 4. Fragility matching (15 points - manual review assumed)
// Default to middle score if not manually reviewed
fragilityScore = 10;

// Calculate total
const totalScore = structuralScore + antipatternScore + contentScore + fragilityScore;

// Determine quality level
let qualityLevel;
if (totalScore >= 90) qualityLevel = 'excellent';
else if (totalScore >= 70) qualityLevel = 'good';
else if (totalScore >= 50) qualityLevel = 'fair';
else qualityLevel = 'poor';

// Output JSON
const result = {
  skillDir,
  scores: {
    structural: structuralScore,
    antipattern: antipatternScore,
    content: contentScore,
    fragility: fragilityScore,
    total: totalScore
  },
  qualityLevel,
  maxScore: 100,
  percentage: totalScore
};

console.log(JSON.stringify(result, null, 2));
