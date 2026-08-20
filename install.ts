#!/usr/bin/env bun
/**
 * install.ts - Install agentic skills, prompts, and AGENTS.md
 * 
 * Usage: bunx github:meyverick/agentic-project
 * 
 * Installs to current directory:
 *   - project/skills/* → .pi/skills/
 *   - project/prompts/* → .pi/prompts/
 *   - project/AGENTS.md → AGENTS.md
 */

import fs from 'fs';
import path from 'path';

// Source directory (where this script lives)
const srcDir = import.meta.dir;

// Target directory (current working directory)
const targetDir = process.cwd();

// Track stats
let copied = 0;
let skipped = 0;
let created = 0;

/**
 * Diff-based copy: only copy if file doesn't exist or content differs
 */
function syncFile(src: string, dst: string): boolean {
  const dstDir = path.dirname(dst);
  
  // Create directory if needed
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
    created++;
  }
  
  // Check if file exists and is identical
  if (fs.existsSync(dst)) {
    const srcContent = fs.readFileSync(src);
    const dstContent = fs.readFileSync(dst);
    
    if (srcContent.equals(dstContent)) {
      skipped++;
      return false; // skipped, no change
    }
  }
  
  // Copy file
  fs.copyFileSync(src, dst);
  copied++;
  return true; // copied
}

/**
 * Sync directory recursively
 */
function syncDir(src: string, dst: string): void {
  if (!fs.existsSync(src)) {
    console.log(`  ⚠️  Source not found: ${src}`);
    return;
  }
  
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
 * Main installation
 */
function install(): void {
  console.log('🔧 Installing agentic...\n');
  
  // 1. Install skills
  const skillsSrc = path.join(srcDir, 'skills');
  const skillsDst = path.join(targetDir, '.pi', 'skills');
  console.log('📦 Skills:');
  syncDir(skillsSrc, skillsDst);
  console.log(`   → ${skillsDst}\n`);
  
  // Reset counters for next section
  copied = 0;
  skipped = 0;
  created = 0;
  
  // 2. Install prompts
  const promptsSrc = path.join(srcDir, 'prompts');
  const promptsDst = path.join(targetDir, '.pi', 'prompts');
  console.log('📝 Prompts:');
  syncDir(promptsSrc, promptsDst);
  console.log(`   → ${promptsDst}\n`);
  
  // Reset counters
  copied = 0;
  skipped = 0;
  created = 0;
  
  // 3. Install AGENTS.md
  const agentsSrc = path.join(srcDir, 'AGENTS.md');
  const agentsDst = path.join(targetDir, 'AGENTS.md');
  console.log('📋 AGENTS.md:');
  if (fs.existsSync(agentsSrc)) {
    syncFile(agentsSrc, agentsDst);
    console.log(`   → ${agentsDst}\n`);
  } else {
    console.log('   ⚠️  Not found\n');
  }
  
  // Summary
  console.log('✅ Done!');
  console.log(`   Copied: ${copied} files`);
  console.log(`   Skipped: ${skipped} files (unchanged)`);
  console.log(`   Created: ${created} directories`);
}

// Run
install();
