#!/usr/bin/env bun
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';

const input = process.argv[2];

if (input === '-h' || input === '--help') {
  console.log('Usage: git-dl.mjs <owner/repo|url> [target-dir]');
  console.log('Default target-dir: references/<repo>');
  process.exit(0);
}

if (!input) {
  console.error('Error: Provide a GitHub URL or owner/repo');
  console.error('Usage: git-dl.mjs <owner/repo|url> [target-dir]');
  console.error('Default target-dir: references/<repo>');
  process.exit(1);
}

// Clean repo string: remove protocol, domain, .git suffix, and surrounding slashes
const repo = input
  .trim()
  .replace(/^git@github\.com:/, '')
  .replace(/^https?:\/\/github\.com\//, '')
  .replace(/^github\.com\//, '')
  .replace(/\.git$/, '')
  .replace(/^\/+|\/+$/g, '');

if (!repo || !repo.includes('/')) {
  console.error(`Error: Invalid GitHub repository format: '${input}'. Expected 'owner/repo' or GitHub URL.`);
  process.exit(1);
}

const defaultDir = join('references', basename(repo));
const dir = process.argv[3] || defaultDir;

// Resolve the latest tag via git ls-remote (version sorted, handles prefixes and monorepos)
let lsOutput;
try {
  lsOutput = execFileSync(
    'git',
    ['ls-remote', '--tags', '--refs', '--sort=v:refname', `https://github.com/${repo}.git`],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
} catch (err) {
  const errMsg = err.stderr ? err.stderr.trim() : err.message;
  console.error(`Error: Failed to query tags for '${repo}': ${errMsg}`);
  process.exit(1);
}

const lines = lsOutput.trim().split('\n').filter(Boolean);
const lastLine = lines[lines.length - 1];
let rawTag = null;
if (lastLine) {
  const parts = lastLine.split(/\s+/);
  if (parts.length >= 2) {
    rawTag = parts[1].replace(/^refs\/tags\//, '');
  }
}

if (!rawTag) {
  console.error(`Error: No tags found for '${repo}'.`);
  process.exit(1);
}

// Reset target directory
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });

// Download tarball via the GitHub codeload endpoint
const tarballUrl = `https://codeload.github.com/${repo}/tar.gz/refs/tags/${rawTag}`;
const res = await fetch(tarballUrl, {
  headers: {
    'User-Agent': 'git-dl/1.0'
  }
});

if (!res.ok) {
  console.error(`Error: Failed to download tarball from ${tarballUrl} (${res.status} ${res.statusText})`);
  process.exit(1);
}

await new Promise((resolve, reject) => {
  const tar = spawn('tar', ['-xz', '-C', dir, '--strip-components=1'], {
    stdio: ['pipe', 'inherit', 'inherit']
  });

  tar.on('error', (err) => reject(new Error(`Failed to run tar: ${err.message}`)));
  tar.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`tar extraction exited with code ${code}`));
  });

  Readable.fromWeb(res.body).pipe(tar.stdin);
});

const displayDir = dir.startsWith('/') || dir.startsWith('.') ? dir : `./${dir}`;
console.log(`Extracted ${repo} (${rawTag}) into ${displayDir}`);
