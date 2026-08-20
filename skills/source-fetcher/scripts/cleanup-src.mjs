#!/usr/bin/env node
/**
 * cleanup-src.mjs — Find and remove unused sources
 * Usage: node cleanup-src.mjs [project-dir]
 * Output: JSON with cleanup status
 */

import { readFileSync, existsSync, readdirSync, statSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectDir = process.argv[2] || process.cwd();
const srcDir = join(projectDir, 'references', 'src');
const sourcesJsonPath = join(srcDir, 'sources.json');

// Load sources.json
function loadSourcesJson() {
  if (!existsSync(sourcesJsonPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(sourcesJsonPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

// Save sources.json
function saveSourcesJson(data) {
  writeFileSync(sourcesJsonPath, JSON.stringify(data, null, 2));
}

// Scan current dependencies
function scanDependencies() {
  const deps = new Set();
  
  // Check package.json
  const packageJsonPath = join(projectDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies) deps.add(...Object.keys(pkg.dependencies));
      if (pkg.devDependencies) deps.add(...Object.keys(pkg.devDependencies));
    } catch (e) {}
  }
  
  // Check Cargo.toml
  const cargoTomlPath = join(projectDir, 'Cargo.toml');
  if (existsSync(cargoTomlPath)) {
    try {
      const cargoContent = readFileSync(cargoTomlPath, 'utf-8');
      const depsMatch = cargoContent.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
      if (depsMatch) {
        const matches = depsMatch[1].match(/(\w[\w-]*)\s*=/g);
        if (matches) {
          matches.forEach(m => deps.add(m.split('=')[0].trim()));
        }
      }
    } catch (e) {}
  }
  
  return deps;
}

// Scan downloaded sources
function scanSources() {
  if (!existsSync(srcDir)) {
    return [];
  }
  
  return readdirSync(srcDir).filter(item => {
    const itemPath = join(srcDir, item);
    return statSync(itemPath).isDirectory() && !item.startsWith('.');
  });
}

// Find unused sources
function findUnused(deps, sources) {
  return sources.filter(source => !deps.has(source));
}

// Main cleanup function
function cleanup() {
  console.log('🧹 Source Cleanup\n');
  
  const deps = scanDependencies();
  const sources = scanSources();
  const unused = findUnused(deps, sources);
  
  console.log(`Dependencies found: ${deps.size}`);
  console.log(`Sources downloaded: ${sources.length}`);
  console.log(`Unused sources: ${unused.length}`);
  
  if (unused.length === 0) {
    console.log('\n✅ No unused sources found.');
    console.log(JSON.stringify({
      status: 'clean',
      dependencies: deps.size,
      sources: sources.length,
      unused: 0
    }));
    return;
  }
  
  console.log('\n📦 Unused sources:');
  unused.forEach(s => console.log(`   - ${s}`));
  
  // In a real implementation, this would prompt for confirmation
  // For now, just report what would be removed
  console.log('\n⚠️  To remove unused sources, run:');
  unused.forEach(s => console.log(`   rm -rf ./references/src/${s}`));
  
  console.log(JSON.stringify({
    status: 'unused_found',
    dependencies: deps.size,
    sources: sources.length,
    unused: unused,
    unused_packages: unused
  }));
}

cleanup();
