#!/usr/bin/env node
/**
 * scan-deps.mjs — Scan dependencies from config files
 * Usage: node scan-deps.mjs <project-dir>
 * Output: JSON with all dependencies to download
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const projectDir = process.argv[2] || process.cwd();

const deps = {
  node: [],
  rust: [],
  python: [],
  go: []
};

// Scan package.json (Node/Bun)
const packageJsonPath = join(projectDir, 'package.json');
if (existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    if (pkg.dependencies) {
      deps.node.push(...Object.keys(pkg.dependencies));
    }
    if (pkg.devDependencies) {
      deps.node.push(...Object.keys(pkg.devDependencies));
    }
  } catch (e) {
    // Invalid package.json
  }
}

// Scan Cargo.toml (Rust)
const cargoTomlPath = join(projectDir, 'Cargo.toml');
if (existsSync(cargoTomlPath)) {
  try {
    const cargoContent = readFileSync(cargoTomlPath, 'utf-8');
    
    // Parse [dependencies] section
    const depsMatch = cargoContent.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depsMatch) {
      const matches = depsMatch[1].match(/(\w[\w-]*)\s*=/g);
      if (matches) {
        deps.rust.push(...matches.map(m => m.split('=')[0].trim()));
      }
    }
    
    // Parse [dev-dependencies] section
    const devDepsMatch = cargoContent.match(/\[dev-dependencies\]([\s\S]*?)(?:\[|$)/);
    if (devDepsMatch) {
      const matches = devDepsMatch[1].match(/(\w[\w-]*)\s*=/g);
      if (matches) {
        deps.rust.push(...matches.map(m => m.split('=')[0].trim()));
      }
    }
  } catch (e) {
    // Invalid Cargo.toml
  }
}

// Scan requirements.txt (Python)
const requirementsPath = join(projectDir, 'requirements.txt');
if (existsSync(requirementsPath)) {
  try {
    const requirements = readFileSync(requirementsPath, 'utf-8');
    const packages = requirements.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].split('[')[0].trim());
    deps.python.push(...packages);
  } catch (e) {
    // Invalid requirements.txt
  }
}

// Scan go.mod (Go)
const goModPath = join(projectDir, 'go.mod');
if (existsSync(goModPath)) {
  try {
    const goContent = readFileSync(goModPath, 'utf-8');
    const requireMatch = goContent.match(/require\s*\(([\s\S]*?)\)/);
    if (requireMatch) {
      const modules = requireMatch[1].match(/(\S+)\s+v/);
      if (modules) {
        deps.go.push(modules[1]);
      }
    }
  } catch (e) {
    // Invalid go.mod
  }
}

// Deduplicate
deps.node = [...new Set(deps.node)];
deps.rust = [...new Set(deps.rust)];
deps.python = [...new Set(deps.python)];
deps.go = [...new Set(deps.go)];

console.log(JSON.stringify(deps, null, 2));
