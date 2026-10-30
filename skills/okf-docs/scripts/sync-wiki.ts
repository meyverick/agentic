#!/usr/bin/env bun
/** Synchronizes ./wiki/ to GitHub Wiki, but only when the repository is public. */
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

function sh(command: string, args: string[], cwd?: string): { ok: boolean; out: string } {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return { ok: result.status === 0, out: (result.stdout ?? "").trim() };
}

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const target = process.argv[2] ?? ".";
process.chdir(target);

if (!existsSync("wiki")) fail(`missing tracked ./wiki directory in ${process.cwd()}`);

if (!sh("gh", ["--version"]).ok) {
  console.log("SKIP: GitHub CLI (gh) not installed; local ./wiki verified, remote sync skipped");
  process.exit(0);
}

const remoteUrl = sh("git", ["config", "--get", "remote.origin.url"]).out;
if (!remoteUrl) {
  console.log(`SKIP: no remote.origin.url configured in ${process.cwd()}`);
  process.exit(0);
}

const slug = /github\.com[:/]([^/]+\/[^/.]+)(\.git)?$/.exec(remoteUrl)?.[1];
if (!slug) {
  console.log(`SKIP: remote origin is not a GitHub repository (${remoteUrl})`);
  process.exit(0);
}

const visibility = sh("gh", ["repo", "view", slug, "--json", "isPrivate", "-q", ".isPrivate"]).out || "unknown";
if (visibility !== "false") {
  console.log(
    `SKIP [${slug}]: repository is private or inaccessible (isPrivate=${visibility}). GitHub Wiki sync is strictly restricted to public repositories.`,
  );
  process.exit(0);
}

console.log(`== [${slug}] Repository is PUBLIC. Ensuring GitHub Wiki is enabled ==`);
if (!sh("gh", ["repo", "edit", slug, "--enable-wiki=true"]).ok) {
  sh("gh", ["api", "-X", "PATCH", `repos/${slug}`, "-f", "has_wiki=true"]);
}

const wikiRemote = `https://github.com/${slug}.wiki.git`;
const work = await mkdtemp(join(tmpdir(), "agentic-wiki-"));
const checkout = join(work, "wiki");
const cleanup = (): void => {
  rm(work, { recursive: true, force: true }).catch(() => undefined);
};

try {
  if (sh("git", ["clone", "-q", wikiRemote, checkout]).ok) {
    console.log(`  cloned existing wiki repository: ${wikiRemote}`);
  } else {
    console.log("  wiki git backend not yet initialized; attempting automated provisioning...");
    await mkdir(checkout, { recursive: true });
    sh("git", ["init", "-q", "-b", "master"], checkout);
    sh("git", ["remote", "add", "origin", wikiRemote], checkout);
  }

  // Mirror: clear everything but the repository metadata, then copy the tracked wiki.
  for (const entry of await readdir(checkout)) {
    if (entry === ".git") continue;
    await rm(join(checkout, entry), { recursive: true, force: true });
  }
  await cp("wiki", checkout, { recursive: true });

  // Derived pages come from the tracked index; a host placeholder must never survive a sync.
  if (existsSync(join(checkout, "index.md"))) {
    const index = await readFile(join(checkout, "index.md"));
    await writeFile(join(checkout, "Home.md"), index);
    await writeFile(join(checkout, "_Sidebar.md"), index);
  }

  // Flatten nested directories so GitHub Wiki routing resolves every link.
  const flatten = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await flatten(path);
        continue;
      }
      if (!entry.name.endsWith(".md") || dir === checkout) continue;
      const flat = relative(checkout, path).split(/[\\/]/).join("-");
      await cp(path, join(checkout, flat));
    }
  };
  await flatten(checkout);

  sh("git", ["add", "-A"], checkout);
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: checkout }).status !== 0;
  if (!staged) {
    console.log(`  [${slug}] GitHub Wiki already up to date`);
  } else {
    sh("git", ["-c", "user.name=agentic", "-c", "user.email=agentic@users.noreply.github.com", "commit", "-q", "-m", "docs(wiki): synchronize OKF v0.2 progressive wiki"], checkout);
    const pushed =
      sh("git", ["push", "-q", "-u", "origin", "HEAD:master"], checkout).ok ||
      sh("git", ["push", "-q", "-u", "origin", "HEAD:main"], checkout).ok;
    if (!pushed) {
      console.error(`WARN [${slug}]: GitHub rejected push to unprovisioned .wiki.git backend.`);
      console.error(`     GitHub requires a one-time initial page creation at https://github.com/${slug}/wiki/_new`);
      process.exitCode = 1;
    } else {
      console.log(`  [${slug}] GitHub Wiki synchronized successfully`);
    }
  }
} catch (error) {
  fail(String(error));
} finally {
  cleanup();
}
