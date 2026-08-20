#!/usr/bin/env bun
/**
 * install.ts - Install agentic skills, prompts, and AGENTS.md
 * 
 * Usage: bunx github:meyverick/agentic-project
 * 
 * Installs to current directory:
 *   - project/skills/* → .pi/skills/ (atomic replacement)
 *   - project/prompts/* → .pi/prompts/
 *   - project/AGENTS.md → AGENTS.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Source directory (where this script lives)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to find the source directory
function findSourceDir(): string {
  if (fs.existsSync(path.join(__dirname, 'skills'))) {
    return __dirname;
  }
  
  const parentDir = path.dirname(__dirname);
  if (fs.existsSync(path.join(parentDir, 'skills'))) {
    return parentDir;
  }
  
  const nodeModulesPath = path.join(__dirname, 'node_modules', 'agentic');
  if (fs.existsSync(nodeModulesPath) && fs.existsSync(path.join(nodeModulesPath, 'skills'))) {
    return nodeModulesPath;
  }
  
  const parentNodeModules = path.join(parentDir, 'node_modules', 'agentic');
  if (fs.existsSync(parentNodeModules) && fs.existsSync(path.join(parentNodeModules, 'skills'))) {
    return parentNodeModules;
  }
  
  return __dirname;
}

const srcDir = findSourceDir();
const targetDir = process.cwd();

// Track stats
let copied = 0;
let skipped = 0;
let replaced = 0;
let created = 0;

/**
 * Get all files in directory recursively
 */
function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(itemPath).map(f => path.join(item, f)));
    } else {
      files.push(item);
    }
  }
  return files;
}

/**
 * Compare two directories - return true if ANY file differs
 */
function hasDifferences(srcDir: string, dstDir: string): boolean {
  if (!fs.existsSync(dstDir)) return true;
  
  const srcFiles = getAllFiles(srcDir);
  const dstFiles = getAllFiles(dstDir);
  
  // Different number of files = different
  if (srcFiles.length !== dstFiles.length) return true;
  
  // Check each file
  for (const file of srcFiles) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(dstDir, file);
    
    if (!fs.existsSync(dstPath)) return true;
    
    const srcContent = fs.readFileSync(srcPath);
    const dstContent = fs.readFileSync(dstPath);
    
    if (!srcContent.equals(dstContent)) return true;
  }
  
  return false; // No differences
}

/**
 * Replace entire skill directory (atomic)
 */
function replaceSkill(srcDir: string, dstDir: string): void {
  // Remove existing directory
  if (fs.existsSync(dstDir)) {
    fs.rmSync(dstDir, { recursive: true, force: true });
  }
  
  // Copy entire directory
  fs.cpSync(srcDir, dstDir, { recursive: true });
  replaced++;
}

/**
 * Diff-based copy for single files (prompts, AGENTS.md)
 */
function syncFile(src: string, dst: string): boolean {
  const dstDir = path.dirname(dst);
  
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
    created++;
  }
  
  if (fs.existsSync(dst)) {
    const srcContent = fs.readFileSync(src);
    const dstContent = fs.readFileSync(dst);
    
    if (srcContent.equals(dstContent)) {
      skipped++;
      return false;
    }
  }
  
  fs.copyFileSync(src, dst);
  copied++;
  return true;
}

/**
 * Install skills atomically
 */
function installSkills(): void {
  const skillsSrc = path.join(srcDir, 'skills');
  const skillsDst = path.join(targetDir, '.pi', 'skills');
  
  console.log('📦 Skills:');
  
  if (!fs.existsSync(skillsSrc)) {
    console.log('  ⚠️  Source not found');
    return;
  }
  
  // Ensure target directory exists
  if (!fs.existsSync(skillsDst)) {
    fs.mkdirSync(skillsDst, { recursive: true });
    created++;
  }
  
  // Get all skills from source
  const skills = fs.readdirSync(skillsSrc).filter(item => {
    const itemPath = path.join(skillsSrc, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  for (const skill of skills) {
    const srcPath = path.join(skillsSrc, skill);
    const dstPath = path.join(skillsDst, skill);
    
    if (!fs.existsSync(dstPath)) {
      // New skill - copy entirely
      fs.cpSync(srcPath, dstPath, { recursive: true });
      copied++;
      console.log(`  + ${skill} (new)`);
    } else if (hasDifferences(srcPath, dstPath)) {
      // Skill changed - replace entirely
      replaceSkill(srcPath, dstPath);
      console.log(`  ~ ${skill} (replaced)`);
    } else {
      // No changes - skip
      skipped++;
      console.log(`  = ${skill} (unchanged)`);
    }
  }
  
  console.log(`\n   → ${skillsDst}`);
  console.log(`   Copied: ${copied} | Replaced: ${replaced} | Skipped: ${skipped}\n`);
}

/**
 * Install prompts (diff-based)
 */
function installPrompts(): void {
  const promptsSrc = path.join(srcDir, 'prompts');
  const promptsDst = path.join(targetDir, '.pi', 'prompts');
  
  console.log('📝 Prompts:');
  
  if (!fs.existsSync(promptsSrc)) {
    console.log('  ⚠️  Source not found\n');
    return;
  }
  
  // Reset counters
  copied = 0;
  skipped = 0;
  created = 0;
  
  syncDir(promptsSrc, promptsDst);
  
  console.log(`   → ${promptsDst}`);
  console.log(`   Copied: ${copied} | Skipped: ${skipped}\n`);
}

/**
 * Install AGENTS.md (diff-based)
 */
function installAgentsMd(): void {
  const agentsSrc = path.join(srcDir, 'AGENTS.md');
  const agentsDst = path.join(targetDir, 'AGENTS.md');
  
  console.log('📋 AGENTS.md:');
  
  if (fs.existsSync(agentsSrc)) {
    copied = 0;
    skipped = 0;
    syncFile(agentsSrc, agentsDst);
    console.log(`   → ${agentsDst}`);
    console.log(`   Copied: ${copied} | Skipped: ${skipped}\n`);
  } else {
    console.log('   ⚠️  Not found\n');
  }
}

/**
 * Create openspec/reports/ directory
 */
function createReportsDir(): void {
  const reportsDst = path.join(targetDir, 'openspec', 'reports');
  console.log('📂 Reports directory:');
  
  if (!fs.existsSync(reportsDst)) {
    fs.mkdirSync(reportsDst, { recursive: true });
    console.log(`   → Created ${reportsDst}\n`);
  } else {
    console.log(`   → ${reportsDst} (exists)\n`);
  }
}

/**
 * Sync directory recursively (for prompts)
 */
function syncDir(src: string, dst: string): void {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(dst, { recursive: true });
    created++;
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const dstPath = path.join(dst, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      syncDir(srcPath, dstPath);
    } else {
      syncFile(srcPath, dstPath);
    }
  }
}

/**
 * Diff-based copy for single files
 */
function syncFile(src: string, dst: string): boolean {
  const dstDir = path.dirname(dst);
  
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
    created++;
  }
  
  if (fs.existsSync(dst)) {
    const srcContent = fs.readFileSync(src);
    const dstContent = fs.readFileSync(dst);
    
    if (srcContent.equals(dstContent)) {
      skipped++;
      return false;
    }
  }
  
  fs.copyFileSync(src, dst);
  copied++;
  return true;
}

/**
 * Main installation
 */
function install(): void {
  console.log('🔧 Installing agentic...\n');
  
  installSkills();
  installPrompts();
  installAgentsMd();
  createReportsDir();
  
  console.log('✅ Done!');
}

// Run
install();
