#!/usr/bin/env node
/**
 * detect-stack.mjs — Detect project stack recursively from config files
 * Usage: node detect-stack.mjs <project-dir>
 * Output: JSON with detected stacks and dependencies
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const projectDir = process.argv[2] || process.cwd();

const detected = {
  stacks: [],
  dependencies: [],
  devDependencies: []
};

// Directories to skip
const SKIP_DIRS = ['node_modules', 'target', 'dist', 'build', '.git', 'vendor'];

// Framework indicators
const FRAMEWORK_INDICATORS = {
  'svelte.config.js': 'sveltekit',
  'vite.config.ts': 'vite',
  'vite.config.js': 'vite',
  'tailwind.config.js': 'tailwindcss',
  'tailwind.config.ts': 'tailwindcss',
  'drizzle.config.ts': 'drizzle',
  'next.config.js': 'nextjs',
  'nuxt.config.js': 'nuxt'
};

// Recursively scan for config files
function scanDirectory(dir, depth = 0) {
  if (depth > 5) return;
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      if (SKIP_DIRS.includes(item)) continue;
      
      const itemPath = join(dir, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath, depth + 1);
      } else {
        // Check for package.json
        if (item === 'package.json') {
          try {
            const pkg = JSON.parse(readFileSync(itemPath, 'utf-8'));
            if (!detected.stacks.includes('node')) {
              detected.stacks.push('node');
            }
            if (pkg.dependencies) {
              detected.dependencies.push(...Object.keys(pkg.dependencies));
            }
            if (pkg.devDependencies) {
              detected.devDependencies.push(...Object.keys(pkg.devDependencies));
            }
            if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock')) || pkg.packageManager?.includes('bun')) {
              if (!detected.stacks.includes('bun')) {
                detected.stacks.push('bun');
              }
            }
          } catch (e) {}
        }
        
        // Check for Cargo.toml
        if (item === 'Cargo.toml') {
          if (!detected.stacks.includes('rust')) {
            detected.stacks.push('rust');
          }
          try {
            const cargoContent = readFileSync(itemPath, 'utf-8');
            const depsMatch = cargoContent.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
            if (depsMatch) {
              const deps = depsMatch[1].match(/(\w[\w-]*)\s*=/g);
              if (deps) {
                detected.dependencies.push(...deps.map(d => d.split('=')[0].trim()));
              }
            }
          } catch (e) {}
        }
        
        // Check for requirements.txt
        if (item === 'requirements.txt') {
          if (!detected.stacks.includes('python')) {
            detected.stacks.push('python');
          }
          try {
            const requirements = readFileSync(itemPath, 'utf-8');
            const packages = requirements.split('\n')
              .filter(line => line.trim() && !line.startsWith('#'))
              .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
            detected.dependencies.push(...packages);
          } catch (e) {}
        }
        
        // Check for go.mod
        if (item === 'go.mod') {
          if (!detected.stacks.includes('go')) {
            detected.stacks.push('go');
          }
        }
        
        // Check for framework indicators
        if (FRAMEWORK_INDICATORS[item] && !detected.stacks.includes(FRAMEWORK_INDICATORS[item])) {
          detected.stacks.push(FRAMEWORK_INDICATORS[item]);
        }
      }
    }
  } catch (e) {
    // Skip unreadable directories
  }
}

// Scan recursively
scanDirectory(projectDir);

// Deduplicate
detected.stacks = [...new Set(detected.stacks)];
detected.dependencies = [...new Set(detected.dependencies)];
detected.devDependencies = [...new Set(detected.devDependencies)];

console.log(JSON.stringify(detected, null, 2));
