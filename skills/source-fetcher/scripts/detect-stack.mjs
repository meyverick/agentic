#!/usr/bin/env node
/**
 * detect-stack.mjs — Detect project stack from config files
 * Usage: node detect-stack.mjs <project-dir>
 * Output: JSON with detected stacks and dependencies
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const projectDir = process.argv[2] || process.cwd();

const detected = {
  stacks: [],
  dependencies: [],
  devDependencies: []
};

// Check for package.json (Node/Bun)
const packageJsonPath = join(projectDir, 'package.json');
if (existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    detected.stacks.push('node');
    
    if (pkg.dependencies) {
      detected.dependencies.push(...Object.keys(pkg.dependencies));
    }
    if (pkg.devDependencies) {
      detected.devDependencies.push(...Object.keys(pkg.devDependencies));
    }
    
    // Check for Bun indicators
    if (existsSync(join(projectDir, 'bun.lockb')) || pkg.packageManager?.includes('bun')) {
      detected.stacks.push('bun');
    }
  } catch (e) {
    // Invalid package.json
  }
}

// Check for Cargo.toml (Rust)
const cargoTomlPath = join(projectDir, 'Cargo.toml');
if (existsSync(cargoTomlPath)) {
  detected.stacks.push('rust');
  
  try {
    const cargoContent = readFileSync(cargoTomlPath, 'utf-8');
    
    // Parse dependencies section
    const depsMatch = cargoContent.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depsMatch) {
      const deps = depsMatch[1].match(/(\w[\w-]*)\s*=/g);
      if (deps) {
        detected.dependencies.push(...deps.map(d => d.split('=')[0].trim()));
      }
    }
  } catch (e) {
    // Invalid Cargo.toml
  }
}

// Check for requirements.txt (Python)
const requirementsPath = join(projectDir, 'requirements.txt');
if (existsSync(requirementsPath)) {
  detected.stacks.push('python');
  
  try {
    const requirements = readFileSync(requirementsPath, 'utf-8');
    const packages = requirements.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
    detected.dependencies.push(...packages);
  } catch (e) {
    // Invalid requirements.txt
  }
}

// Check for go.mod (Go)
const goModPath = join(projectDir, 'go.mod');
if (existsSync(goModPath)) {
  detected.stacks.push('go');
}

// Check for framework indicators
const files = readdirSync(projectDir);
if (files.includes('svelte.config.js')) detected.stacks.push('sveltekit');
if (files.includes('vite.config.ts') || files.includes('vite.config.js')) detected.stacks.push('vite');
if (files.includes('tailwind.config.js') || files.includes('tailwind.config.ts')) detected.stacks.push('tailwindcss');
if (files.includes('drizzle.config.ts')) detected.stacks.push('drizzle');

// Deduplicate
detected.stacks = [...new Set(detected.stacks)];
detected.dependencies = [...new Set(detected.dependencies)];
detected.devDependencies = [...new Set(detected.devDependencies)];

console.log(JSON.stringify(detected, null, 2));
