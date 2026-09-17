#!/usr/bin/env bun
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const USER_AGENT = 'agentic-dep-checker/1.0 (https://github.com/meyverick/agentic)';
const includeReferences = process.argv.includes('--all') || process.argv.includes('--references');
const isJson = process.argv.includes('--json');

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_FILE);
const targetArg = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const SCAN_ROOT = targetArg ? resolve(process.cwd(), targetArg) : join(SCRIPT_DIR, '..');

const IGNORED_DIRS = new Set([
  'node_modules',
  'target',
  '.git',
  '.svelte-kit',
  'build',
  'dist',
  'vendor',
  ...(includeReferences ? [] : ['references'])
]);

async function asyncPool(limit, items, iteratorFn) {
  const ret = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

async function scanFiles(dir) {
  const results = { cargo: [], npm: [], lockFiles: [], toolchains: [] };

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (fullPath === SCRIPT_FILE || IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (entry.name === 'Cargo.toml') {
          results.cargo.push(fullPath);
        } else if (entry.name === 'package.json') {
          results.npm.push(fullPath);
        } else if (entry.name === 'Cargo.lock') {
          results.lockFiles.push(fullPath);
        } else if (entry.name === 'rust-toolchain.toml' || entry.name === 'rust-toolchain') {
          results.toolchains.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return results;
}

async function detectToolchains(toolchainFiles, cargoFiles, npmFiles) {
  let rustVersion = null;

  for (const tf of toolchainFiles) {
    try {
      const content = await readFile(tf, 'utf8');
      const channelMatch = content.match(/channel\s*=\s*"([^"]+)"/) || content.match(/^([0-9a-zA-Z.-]+)$/m);
      if (channelMatch && !channelMatch[1].startsWith('nightly') && !channelMatch[1].startsWith('beta')) {
        rustVersion = channelMatch[1].replace(/^stable-?/, '');
        break;
      }
    } catch {}
  }

  if (!rustVersion) {
    for (const cf of cargoFiles) {
      try {
        const content = await readFile(cf, 'utf8');
        const msrv = content.match(/rust-version\s*=\s*"([^"]+)"/);
        if (msrv) {
          rustVersion = msrv[1];
          break;
        }
      } catch {}
    }
  }

  if (!rustVersion) {
    try {
      const out = execSync('rustc --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const m = out.match(/rustc\s+([0-9]+\.[0-9]+\.[0-9]+)/);
      if (m) rustVersion = m[1];
    } catch {}
  }

  let cargoVersion = null;
  try {
    const out = execSync('cargo --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const m = out.match(/cargo\s+([0-9]+\.[0-9]+\.[0-9]+)/);
    if (m) cargoVersion = m[1];
  } catch {}

  let bunVersion = null;
  for (const nf of npmFiles) {
    try {
      const pkg = JSON.parse(await readFile(nf, 'utf8'));
      if (pkg.packageManager?.startsWith('bun@')) {
        bunVersion = pkg.packageManager.replace(/^bun@/, '');
        break;
      }
      if (pkg.engines?.bun) {
        bunVersion = pkg.engines.bun;
        break;
      }
    } catch {}
  }

  if (!bunVersion && typeof Bun !== 'undefined') {
    bunVersion = Bun.version;
  } else if (!bunVersion) {
    try {
      const out = execSync('bun --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      bunVersion = out.trim();
    } catch {}
  }

  const items = [];
  if (rustVersion) {
    items.push({ name: 'rust', version: rustVersion });
  }
  if (cargoVersion || rustVersion) {
    items.push({ name: 'cargo', version: cargoVersion || rustVersion });
  }
  if (bunVersion) {
    items.push({ name: 'bun', version: bunVersion });
  }

  return items;
}

async function fetchLatestToolchain() {
  try {
    const res = await fetch('https://static.rust-lang.org/dist/channel-rust-stable.toml', {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/\[pkg\.rust\][\s\S]*?version\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function parseCargoLocks(lockFiles) {
  const lockedVersions = new Map();
  for (const lockPath of lockFiles) {
    try {
      const content = await readFile(lockPath, 'utf8');
      const blocks = content.split('[[package]]');
      for (const block of blocks) {
        const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
        const verMatch = block.match(/version\s*=\s*"([^"]+)"/);
        if (nameMatch && verMatch) {
          const name = nameMatch[1];
          const ver = verMatch[1];
          if (!lockedVersions.has(name)) {
            lockedVersions.set(name, []);
          }
          lockedVersions.get(name).push(ver);
        }
      }
    } catch {}
  }
  return lockedVersions;
}

function resolveLockedVersion(name, declaredVer, lockedMap) {
  const versions = lockedMap.get(name);
  if (!versions || versions.length === 0) return declaredVer;
  if (versions.length === 1) return versions[0];

  const clean = declaredVer.replace(/^[\^~>=<]+/, '').trim();
  const dParts = clean.split('.').map((p) => parseInt(p, 10) || 0);

  const matched = versions.find((v) => {
    const vParts = v.split('.').map((p) => parseInt(p, 10) || 0);
    if (dParts[0] === 0) {
      return vParts[0] === 0 && vParts[1] === dParts[1];
    }
    return vParts[0] === dParts[0];
  });

  return matched || versions[0];
}

function getCrateIndexPath(crateName) {
  const name = crateName.toLowerCase();
  if (name.length === 1) return `1/${name}`;
  if (name.length === 2) return `2/${name}`;
  if (name.length === 3) return `3/${name[0]}/${name}`;
  return `${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`;
}

async function fetchLatestCrate(crateName) {
  let version = null;

  try {
    const indexPath = getCrateIndexPath(crateName);
    const indexRes = await fetch(`https://index.crates.io/${indexPath}`, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (indexRes.ok) {
      const text = await indexRes.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (!entry.yanked) {
            version = entry.vers;
            break;
          }
        } catch {}
      }
    }

    return { version };
  } catch {
    return { version: null };
  }
}

async function fetchLatestNpm(pkgName) {
  try {
    const encoded = pkgName.startsWith('@')
      ? `@${encodeURIComponent(pkgName.slice(1))}`
      : encodeURIComponent(pkgName);
    const res = await fetch(`https://registry.npmjs.org/${encoded}`);
    if (!res.ok) return { version: null };
    const data = await res.json();
    const version = data['dist-tags']?.latest ?? Object.keys(data.versions || {}).pop() ?? null;
    return { version };
  } catch {
    return { version: null };
  }
}

function parseCargoDependencies(content) {
  const deps = [];
  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    const sectionMatch = trimmed.match(/^\[(.*)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    if (
      currentSection === 'dependencies' ||
      currentSection === 'dev-dependencies' ||
      currentSection === 'build-dependencies' ||
      currentSection === 'workspace.dependencies' ||
      currentSection?.endsWith('.dependencies')
    ) {
      const depMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
      if (depMatch) {
        const name = depMatch[1];
        const val = depMatch[2];
        let version = null;
        let git = null;

        if (val.startsWith('"')) {
          version = val.split('"')[1];
        } else if (val.startsWith('{')) {
          const vMatch = val.match(/version\s*=\s*"([^"]+)"/);
          if (vMatch) version = vMatch[1];
          const gMatch = val.match(/git\s*=\s*"([^"]+)"/);
          if (gMatch) git = gMatch[1];
        }

        if ((version && !version.startsWith('workspace')) || git) {
          deps.push({ name, version: version ?? 'git', git, section: currentSection });
        }
      }
    }
  }

  return deps;
}

function getSemverDiff(declared, latest) {
  if (!latest) return { status: 'UNKNOWN' };

  const cleanDeclared = declared.replace(/^[\^~>=<]+/, '').trim();
  if (cleanDeclared === latest || latest.startsWith(cleanDeclared)) {
    return { status: 'UP_TO_DATE' };
  }

  const dParts = cleanDeclared.split('.').map((p) => parseInt(p, 10) || 0);
  const lParts = latest.split('.').map((p) => parseInt(p, 10) || 0);

  if (dParts[0] === 0 && lParts[0] === 0) {
    if (dParts[1] !== lParts[1]) {
      return { status: 'MAJOR_BREAKING', reason: `0.${dParts[1]}.x -> 0.${lParts[1]}.x (Breaking API Shift)` };
    }
    return { status: 'MINOR_PATCH', reason: `0.${dParts[1]}.${dParts[2] || 0} -> ${latest}` };
  }

  if (dParts[0] !== lParts[0]) {
    return { status: 'MAJOR_BREAKING', reason: `${dParts[0]}.x -> ${lParts[0]}.x (Major Version Bump)` };
  }

  return { status: 'MINOR_PATCH', reason: `${cleanDeclared} -> ${latest}` };
}

async function main() {
  if (!isJson) {
    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  Agentic - Dependency Freshness Verifier                       ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
  }

  const rootDir = SCAN_ROOT;
  const { cargo, npm, lockFiles, toolchains } = await scanFiles(rootDir);
  const lockedMap = await parseCargoLocks(lockFiles);
  const toolchainItems = await detectToolchains(toolchains, cargo, npm);

  let totalChecked = 0;
  let totalUpToDate = 0;
  let totalMinorPatch = 0;
  let totalMajorBreaking = 0;

  const jsonReport = {
    summary: {
      totalChecked: 0,
      upToDate: 0,
      minorPatch: 0,
      majorBreaking: 0
    },
    toolchains: [],
    rustModules: [],
    npmModules: []
  };

  // 1. Toolchains (Rust, Cargo, Bun)
  if (toolchainItems.length > 0) {
    if (!isJson) {
      console.log(`${colors.bold}${colors.blue}⚙ Toolchains: Rust, Cargo & Bun${colors.reset}`);
    }
    const latestRust = await fetchLatestToolchain();
    const { version: latestBun } = await fetchLatestNpm('bun');

    for (const item of toolchainItems) {
      totalChecked++;
      const isBun = item.name === 'bun';
      const latestVer = isBun ? latestBun : latestRust;
      const depLabel = item.name.padEnd(24, ' ');
      const currentLabel = `current: ${item.version}`.padEnd(16, ' ');
      const latestLabel = `latest: ${latestVer ?? 'unknown'}`.padEnd(16, ' ');
      const diff = getSemverDiff(item.version, latestVer);

      if (diff.status === 'UP_TO_DATE') {
        totalUpToDate++;
        if (!isJson) console.log(`  ${colors.green}✓${colors.reset} ${depLabel} ${currentLabel} ${latestLabel} ${colors.green}[UP TO DATE]${colors.reset}`);
      } else if (diff.status === 'MINOR_PATCH') {
        totalMinorPatch++;
        if (!isJson) console.log(`  ${colors.yellow}↑${colors.reset} ${colors.bold}${depLabel}${colors.reset} ${currentLabel} ${colors.yellow}${latestLabel}${colors.reset} ${colors.yellow}[UPDATE AVAILABLE]${colors.reset}`);
      } else if (diff.status === 'MAJOR_BREAKING') {
        totalMajorBreaking++;
        if (!isJson) console.log(`  ${colors.magenta}◆${colors.reset} ${depLabel} ${currentLabel} ${colors.magenta}${latestLabel}${colors.reset} ${colors.dim}[MAJOR/TOOLCHAIN BUMP: ${diff.reason}]${colors.reset}`);
      } else {
        if (!isJson) console.log(`  ${colors.dim}•${colors.reset} ${depLabel} ${currentLabel} ${latestLabel} ${colors.yellow}[CHECK FAILED]${colors.reset}`);
      }

      if (isJson) {
        jsonReport.toolchains.push({
          name: item.name,
          current: item.version,
          latest: latestVer ?? null,
          status: diff.status,
          reason: diff.reason ?? null
        });
      }
    }
    if (!isJson) console.log();
  }

  // 2. Rust Modules
  for (const cargoPath of cargo) {
    const relPath = relative(rootDir, cargoPath);
    const content = await readFile(cargoPath, 'utf8');
    const deps = parseCargoDependencies(content);

    if (deps.length === 0) continue;

    if (!isJson) {
      console.log(`${colors.bold}${colors.blue}📦 Rust Module: ${relPath}${colors.reset}`);
    }

    const currentModule = { file: relPath, dependencies: [] };

    const results = await asyncPool(10, deps, async (dep) => {
      if (dep.git) {
        return { ...dep, latest: 'git' };
      }
      const { version: latest } = await fetchLatestCrate(dep.name);
      return { ...dep, latest };
    });

    for (const r of results) {
      totalChecked++;
      const depLabel = r.name.padEnd(24, ' ');
      const currentLabel = `current: ${r.version}`.padEnd(16, ' ');
      const latestLabel = `latest: ${r.latest ?? 'unknown'}`.padEnd(16, ' ');
      const diff = getSemverDiff(r.version, r.latest);

      if (diff.status === 'UP_TO_DATE') {
        totalUpToDate++;
        if (!isJson) console.log(`  ${colors.green}✓${colors.reset} ${depLabel} ${currentLabel} ${latestLabel} ${colors.green}[UP TO DATE]${colors.reset}`);
      } else if (diff.status === 'MINOR_PATCH') {
        totalMinorPatch++;
        if (!isJson) console.log(`  ${colors.yellow}↑${colors.reset} ${colors.bold}${depLabel}${colors.reset} ${currentLabel} ${colors.yellow}${latestLabel}${colors.reset} ${colors.yellow}[UPDATE AVAILABLE]${colors.reset}`);
      } else if (diff.status === 'MAJOR_BREAKING') {
        totalMajorBreaking++;
        if (!isJson) console.log(`  ${colors.magenta}◆${colors.reset} ${depLabel} ${currentLabel} ${colors.magenta}${latestLabel}${colors.reset} ${colors.dim}[MAJOR/PEER LOCKED: ${diff.reason}]${colors.reset}`);
      } else {
        if (!isJson) console.log(`  ${colors.dim}•${colors.reset} ${depLabel} ${currentLabel} ${latestLabel} ${colors.yellow}[CHECK FAILED]${colors.reset}`);
      }

      const activeVersion = resolveLockedVersion(r.name, r.version, lockedMap);

      if (isJson) {
        currentModule.dependencies.push({
          name: r.name,
          declaredVersion: r.version,
          resolvedVersion: activeVersion,
          latest: r.latest ?? null,
          status: diff.status,
          reason: diff.reason ?? null,
          section: r.section
        });
      }
    }

    if (isJson) jsonReport.rustModules.push(currentModule);
    if (!isJson) console.log();
  }

  // 3. NPM Modules
  for (const npmPath of npm) {
    const relPath = relative(rootDir, npmPath);
    const raw = await readFile(npmPath, 'utf8');
    let pkgJson = {};
    try {
      pkgJson = JSON.parse(raw);
    } catch {
      continue;
    }

    const allDeps = [];
    if (pkgJson.dependencies) {
      for (const [name, version] of Object.entries(pkgJson.dependencies)) {
        if (!version.startsWith('workspace:')) {
          allDeps.push({ name, version, type: 'prod' });
        }
      }
    }
    if (pkgJson.devDependencies) {
      for (const [name, version] of Object.entries(pkgJson.devDependencies)) {
        if (!version.startsWith('workspace:')) {
          allDeps.push({ name, version, type: 'dev' });
        }
      }
    }

    if (allDeps.length === 0) continue;

    if (!isJson) {
      console.log(`${colors.bold}${colors.magenta}🌐 NPM/Web Module: ${relPath}${colors.reset}`);
    }

    const currentModule = { file: relPath, dependencies: [] };

    const results = await asyncPool(10, allDeps, async (dep) => {
      const { version: latest } = await fetchLatestNpm(dep.name);
      return { ...dep, latest };
    });

    for (const r of results) {
      totalChecked++;
      const depLabel = r.name.padEnd(28, ' ');
      const currentLabel = `current: ${r.version}`.padEnd(18, ' ');
      const latestLabel = `latest: ${r.latest ?? 'unknown'}`.padEnd(16, ' ');
      const diff = getSemverDiff(r.version, r.latest);

      if (diff.status === 'UP_TO_DATE') {
        totalUpToDate++;
        if (!isJson) console.log(`  ${colors.green}✓${colors.reset} ${depLabel} ${currentLabel} ${latestLabel} ${colors.green}[UP TO DATE]${colors.reset}`);
      } else if (diff.status === 'MINOR_PATCH') {
        totalMinorPatch++;
        if (!isJson) console.log(`  ${colors.yellow}↑${colors.reset} ${colors.bold}${depLabel}${colors.reset} ${currentLabel} ${colors.yellow}${latestLabel}${colors.reset} ${colors.yellow}[UPDATE AVAILABLE]${colors.reset}`);
      } else if (diff.status === 'MAJOR_BREAKING') {
        totalMajorBreaking++;
        if (!isJson) console.log(`  ${colors.magenta}◆${colors.reset} ${depLabel} ${currentLabel} ${colors.magenta}${latestLabel}${colors.reset} ${colors.dim}[MAJOR/PEER LOCKED: ${diff.reason}]${colors.reset}`);
      } else {
        if (!isJson) console.log(`  ${colors.dim}•${colors.reset} ${depLabel} ${currentLabel} ${latestLabel} ${colors.yellow}[CHECK FAILED]${colors.reset}`);
      }

      if (isJson) {
        currentModule.dependencies.push({
          name: r.name,
          declaredVersion: r.version,
          latest: r.latest ?? null,
          status: diff.status,
          reason: diff.reason ?? null,
          type: r.type
        });
      }
    }

    if (isJson) jsonReport.npmModules.push(currentModule);
    if (!isJson) console.log();
  }

  jsonReport.summary = {
    totalChecked,
    upToDate: totalUpToDate,
    minorPatch: totalMinorPatch,
    majorBreaking: totalMajorBreaking
  };

  if (isJson) {
    console.log(JSON.stringify(jsonReport));
  } else {
    console.log(`${colors.bold}${colors.cyan}----------------------------------------------------------------${colors.reset}`);
    console.log(`${colors.bold}Summary:${colors.reset} Checked ${totalChecked} dependencies:`);
    console.log(`  ${colors.green}✓ ${totalUpToDate} Up to date${colors.reset}`);
    if (totalMinorPatch > 0) {
      console.log(`  ${colors.yellow}↑ ${totalMinorPatch} Compatible updates available${colors.reset}`);
    }
    if (totalMajorBreaking > 0) {
      console.log(`  ${colors.magenta}◆ ${totalMajorBreaking} Upstream/Peer-locked major releases (breaking changes requiring framework-wide migration)${colors.reset}`);
    }
    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
  }
}

main().catch((err) => {
  if (isJson) {
    console.error(JSON.stringify({ error: err.message }));
  } else {
    console.error('Error running dependency check:', err);
  }
  process.exit(1);
});