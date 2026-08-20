#!/usr/bin/env node
/**
 * compute-benchmark.mjs — Aggregate eval results into benchmark.json
 * Usage: node compute-benchmark.mjs <eval-dir>
 * Output: JSON with pass rates, timing stats, comparison
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const evalDir = process.argv[2];

if (!evalDir) {
  console.error(JSON.stringify({
    error: 'Usage: node compute-benchmark.mjs <eval-dir>'
  }));
  process.exit(1);
}

if (!existsSync(evalDir)) {
  console.error(JSON.stringify({
    error: 'Eval directory not found',
    path: evalDir
  }));
  process.exit(1);
}

// Find grading and timing files
function findFiles(dir, pattern) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const itemPath = join(dir, item);
    const stat = statSync(itemPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(itemPath, pattern));
    } else if (item === pattern) {
      files.push(itemPath);
    }
  }
  
  return files;
}

const gradingFiles = findFiles(evalDir, 'grading.json');
const timingFiles = findFiles(evalDir, 'timing.json');

if (gradingFiles.length === 0) {
  console.error(JSON.stringify({
    error: 'No grading.json files found in eval directory',
    path: evalDir
  }));
  process.exit(1);
}

// Aggregate pass rates
let totalPass = 0;
let totalAssertions = 0;
let evalCount = 0;

for (const file of gradingFiles) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    totalPass += data.summary?.pass || 0;
    totalAssertions += data.summary?.total || 0;
    evalCount++;
  } catch (e) {
    // Skip invalid files
  }
}

// Aggregate timing
let totalTokens = 0;
let totalDurationMs = 0;
let timingCount = 0;

for (const file of timingFiles) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    totalTokens += data.total_tokens || 0;
    totalDurationMs += data.duration_ms || 0;
    timingCount++;
  } catch (e) {
    // Skip invalid files
  }
}

// Compute averages
const passRate = evalCount > 0 ? (totalPass / totalAssertions).toFixed(4) : '0';
const avgTokens = timingCount > 0 ? Math.round(totalTokens / timingCount) : 0;
const avgDurationMs = timingCount > 0 ? Math.round(totalDurationMs / timingCount) : 0;

// Build result
console.log(JSON.stringify({
  evals: {
    count: evalCount,
    total_assertions: totalAssertions,
    total_pass: totalPass,
    pass_rate: parseFloat(passRate)
  },
  timing: {
    count: timingCount,
    total_tokens: totalTokens,
    total_duration_ms: totalDurationMs,
    avg_tokens: avgTokens,
    avg_duration_ms: avgDurationMs
  },
  timestamp: new Date().toISOString()
}));
