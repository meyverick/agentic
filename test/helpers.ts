import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Pkg } from "../src/pkg.ts";
import { loadPackage } from "../src/pkg.ts";

const created: string[] = [];

export async function scratch(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `agentic-${prefix}-`));
  created.push(dir);
  return dir;
}

export async function cleanupScratch(): Promise<void> {
  for (const dir of created.splice(0)) await rm(dir, { recursive: true, force: true });
}

export function emitter(): { lines: string[]; emit: (line: string) => void } {
  const lines: string[] = [];
  return { lines, emit: (line) => lines.push(line) };
}

export async function put(path: string, content: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

/** Builds a package fixture: manifest, rulebook, and the given skill directories. */
export async function fixturePackage(
  base: string,
  skills: Record<string, Record<string, string>>,
  rulebook = "RULEBOOK v1\n",
): Promise<Pkg> {
  const root = join(base, "pkg");
  await mkdir(join(root, "skills"), { recursive: true });
  await put(join(root, "package.json"), JSON.stringify({ name: "@meyverick/agentic", version: "9.9.9" }));
  await put(join(root, "AGENTS.md"), rulebook);
  for (const [name, files] of Object.entries(skills)) {
    for (const [file, content] of Object.entries(files)) {
      await put(join(root, "skills", name, file), content);
    }
  }
  return loadPackage(join(root, "skills"));
}

/** Deterministic snapshot of a directory tree: sorted "rel:sha256" lines. */
export async function snapshot(dir: string): Promise<string[]> {
  const lines: string[] = [];
  async function walk(current: string, prefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(current, entry.name), rel);
      else lines.push(`${rel}:${createHash("sha256").update(await readFile(join(current, entry.name))).digest("hex")}`);
    }
  }
  await walk(dir, "");
  return lines.sort();
}
