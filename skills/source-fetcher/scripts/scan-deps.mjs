#!/usr/bin/env node
/**
 * scan-deps.mjs — Scan dependencies recursively from config files
 * Usage: node scan-deps.mjs <project-dir>
 * Output: JSON with all dependencies to download
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const projectDir = process.argv[2] || process.cwd();

const deps = {
  node: [],
  rust: [],
  python: [],
  go: []
};

// Config files to search for
const CONFIG_FILES = {
  node: 'package.json',
  rust: 'Cargo.toml',
  python: 'requirements.txt',
  go: 'go.mod'
};

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  'target',
  'dist',
  'build',
  '.git',
  'vendor',
  '__pycache__'
];

// Recursively find config files
function findConfigFiles(dir, depth = 0) {
  const results = [];
  
  if (depth > 5) return results; // Limit recursion depth
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      if (SKIP_DIRS.includes(item)) continue;
      
      const itemPath = join(dir, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        results.push(...findConfigFiles(itemPath, depth + 1));
      } else if (item === 'package.json') {
        results.push({ type: 'node', path: itemPath });
      } else if (item === 'Cargo.toml') {
        results.push({ type: 'rust', path: itemPath });
      } else if (item === 'requirements.txt') {
        results.push({ type: 'python', path: itemPath });
      } else if (item === 'go.mod') {
        results.push({ type: 'go', path: itemPath });
      }
    }
  } catch (e) {
    // Skip unreadable directories
  }
  
  return results;
}

// Parse package.json
function parsePackageJson(filePath) {
  try {
    const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
    const result = [];
    
    if (pkg.dependencies) {
      result.push(...Object.keys(pkg.dependencies));
    }
    if (pkg.devDependencies) {
      result.push(...Object.keys(pkg.devDependencies));
    }
    
    return result;
  } catch (e) {
    return [];
  }
}

// Parse Cargo.toml
function parseCargoToml(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const result = [];
    
    // Parse [dependencies] section
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depsMatch) {
      const matches = depsMatch[1].match(/(\w[\w-]*)\s*=/g);
      if (matches) {
        result.push(...matches.map(m => m.split('=')[0].trim()));
      }
    }
    
    // Parse [dev-dependencies] section
    const devDepsMatch = content.match(/\[dev-dependencies\]([\s\S]*?)(?:\[|$)/);
    if (devDepsMatch) {
      const matches = devDepsMatch[1].match(/(\w[\w-]*)\s*=/g);
      if (matches) {
        result.push(...matches.map(m => m.split('=')[0].trim()));
      }
    }
    
    return result;
  } catch (e) {
    return [];
  }
}

// Parse requirements.txt
function parseRequirementsTxt(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].split('[')[0].trim());
  } catch (e) {
    return [];
  }
}

// Parse go.mod
function parseGoMod(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireMatch) {
      const modules = requireMatch[1].match(/(\S+)\s+v/g);
      if (modules) {
        return modules.map(m => m.split(' ')[0]);
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

// Main function
function scan() {
  console.log(`Scanning ${projectDir} recursively...\n`);
  
  const configFiles = findConfigFiles(projectDir);
  
  console.log(`Found ${configFiles.length} config files\n`);
  
  for (const { type, path: filePath } of configFiles) {
    console.log(`Processing: ${filePath}`);
    
    let packages = [];
    
    switch (type) {
      case 'node':
        packages = parsePackageJson(filePath);
        deps.node.push(...packages);
        break;
      case 'rust':
        packages = parseCargoToml(filePath);
        deps.rust.push(...packages);
        break;
      case 'python':
        packages = parseRequirementsTxt(filePath);
        deps.python.push(...packages);
        break;
      case 'go':
        packages = parseGoMod(filePath);
        deps.go.push(...packages);
        break;
    }
    
    console.log(`  Found ${packages.length} packages`);
  }
  
  // Deduplicate
  deps.node = [...new Set(deps.node)];
  deps.rust = [...new Set(deps.rust)];
  deps.python = [...new Set(deps.python)];
  deps.go = [...new Set(deps.go)];
  
  console.log(`\nTotal unique packages: ${deps.node.length + deps.rust.length + deps.python.length + deps.go.length}`);
  
  console.log(JSON.stringify(deps, null, 2));
}

scan();
