#!/usr/bin/env node
/**
 * download-src.mjs — Download source code from GitHub/registries
 * Usage: node download-src.mjs <package-name> <output-dir>
 * Output: JSON with download status
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const packageName = process.argv[2];
const outputDir = process.argv[3] || './references/src';

if (!packageName) {
  console.error(JSON.stringify({
    error: 'Usage: node download-src.mjs <package-name> [output-dir]'
  }));
  process.exit(1);
}

const targetDir = join(outputDir, packageName);
const sourcesJsonPath = join(outputDir, 'sources.json');

// Create output directory if needed
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

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

// Add entry to sources.json
function addSourceEntry(pkg, url) {
  const sources = loadSourcesJson();
  sources[pkg] = url;
  saveSourcesJson(sources);
}

// Check if all files in directory match
function allFilesMatch(srcDir, dstDir) {
  if (!existsSync(dstDir)) return false;
  
  const srcFiles = getAllFiles(srcDir);
  const dstFiles = getAllFiles(dstDir);
  
  if (srcFiles.length !== dstFiles.length) return false;
  
  for (const file of srcFiles) {
    const srcPath = join(srcDir, file);
    const dstPath = join(dstDir, file);
    
    if (!existsSync(dstPath)) return false;
    
    const srcContent = readFileSync(srcPath);
    const dstContent = readFileSync(dstPath);
    
    if (!srcContent.equals(dstContent)) return false;
  }
  
  return true;
}

// Get all files recursively
function getAllFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  
  const items = readdirSync(dir);
  for (const item of items) {
    const itemPath = join(dir, item);
    const stat = statSync(itemPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(itemPath).map(f => join(item, f)));
    } else {
      files.push(item);
    }
  }
  return files;
}

// Try to find GitHub repo
async function findGitHubRepo(pkg) {
  // Try npm registry first
  try {
    const response = await fetch(`https://registry.npmjs.org/${pkg}`);
    if (response.ok) {
      const data = await response.json();
      const repo = data.repository?.url || data.homepage;
      if (repo) {
        return repo.replace('git+', '').replace('.git', '').replace('https://github.com/', '');
      }
    }
  } catch (e) {
    // Not on npm
  }
  
  // Try common GitHub patterns
  const patterns = [
    pkg,
    `drizzle-team/${pkg}`,
    `tokio-rs/${pkg}`,
    `rayon-rs/${pkg}`
  ];
  
  for (const pattern of patterns) {
    try {
      const response = await fetch(`https://api.github.com/repos/${pattern}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (response.ok) {
        return pattern;
      }
    } catch (e) {
      // Not found
    }
  }
  
  return null;
}

// Download source from GitHub
async function downloadFromGitHub(repo, target) {
  try {
    console.log(`  Downloading from github.com/${repo}...`);
    
    // Clone with depth 1 (shallow clone)
    execSync(`git clone --depth 1 https://github.com/${repo}.git "${target}"`, {
      stdio: 'ignore'
    });
    
    // Remove .git directory
    const gitDir = join(target, '.git');
    if (existsSync(gitDir)) {
      execSync(`rm -rf "${gitDir}"`);
    }
    
    return true;
  } catch (e) {
    console.error(`  Failed to download from GitHub: ${e.message}`);
    return false;
  }
}

// Download from npm
async function downloadFromNpm(pkg, target) {
  try {
    console.log(`  Downloading from npm: ${pkg}...`);
    
    const response = await fetch(`https://registry.npmjs.org/${pkg}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    
    // Try to get GitHub repo
    if (data.repository?.url) {
      const repo = data.repository.url.replace('git+', '').replace('.git', '').replace('https://github.com/', '');
      return await downloadFromGitHub(repo, target);
    }
    
    return false;
  } catch (e) {
    console.error(`  Failed to download from npm: ${e.message}`);
    return false;
  }
}

// Main download function
async function download() {
  console.log(`\n📦 Downloading: ${packageName}`);
  
  // Check sources.json first
  const sources = loadSourcesJson();
  if (sources[packageName]) {
    console.log(`  Found in sources.json: ${sources[packageName]}`);
    const success = await downloadFromGitHub(sources[packageName], targetDir);
    if (success) {
      console.log(JSON.stringify({
        status: 'downloaded',
        package: packageName,
        source: 'sources.json',
        path: targetDir
      }));
      return;
    }
  }
  
  // Try GitHub
  const githubRepo = await findGitHubRepo(packageName);
  if (githubRepo) {
    const success = await downloadFromGitHub(githubRepo, targetDir);
    if (success) {
      addSourceEntry(packageName, githubRepo);
      console.log(JSON.stringify({
        status: 'downloaded',
        package: packageName,
        source: 'github',
        path: targetDir
      }));
      return;
    }
  }
  
  // Try npm
  const npmSuccess = await downloadFromNpm(packageName, targetDir);
  if (npmSuccess) {
    addSourceEntry(packageName, `npm:${packageName}`);
    console.log(JSON.stringify({
      status: 'downloaded',
      package: packageName,
      source: 'npm',
      path: targetDir
    }));
    return;
  }
  
  // Failed - add placeholder entry
  addSourceEntry(packageName, 'NEEDS_MANUAL_ENTRY');
  console.log(JSON.stringify({
    status: 'failed',
    package: packageName,
    error: 'Could not find source for package. Added to sources.json for manual entry.'
  }));
}

download();
