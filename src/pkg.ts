import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Targets {
  home: string;
  skills: string;
  rulebooks: string[];
}

/** ponytail: AGENTIC_HOME is the test seam; a separate profile knob can wait. */
export function homeDir(): string {
  return process.env.AGENTIC_HOME || homedir();
}

export function targets(home: string): Targets {
  return {
    home,
    skills: join(home, ".agents", "skills"),
    rulebooks: [join(home, ".pi", "agent", "AGENTS.md"), join(home, ".gemini", "AGENTS.md")],
  };
}

export interface Skill {
  name: string;
  dir: string;
}

export interface Pkg {
  root: string;
  version: string;
  rulebook: string;
  skills: Skill[];
}

interface Manifest {
  name?: string;
  version?: string;
}

async function readManifest(path: string): Promise<Manifest | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Manifest;
  } catch {
    return null;
  }
}

export async function findPackageRoot(from: string, name: string): Promise<string> {
  let dir = from;
  for (;;) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      const parsed = await readManifest(manifest);
      if (parsed?.name === name) return dir;
    }
    const up = dirname(dir);
    if (up === dir) throw new Error(`package root '${name}' not found above ${from}`);
    dir = up;
  }
}

export async function loadPackage(fromDir: string): Promise<Pkg> {
  const root = await findPackageRoot(fromDir, "@meyverick/agentic");
  const parsed = await readManifest(join(root, "package.json"));
  if (!parsed) throw new Error(`unreadable package.json at ${root}`);
  const skillsDir = join(root, "skills");
  const entries = await readdir(skillsDir, { withFileTypes: true });

  return {
    root,
    version: parsed.version ?? "0.0.0",
    rulebook: join(root, "AGENTS.md"),
    skills: entries
      .filter((entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, "SKILL.md")))
      .map((entry) => ({ name: entry.name, dir: join(skillsDir, entry.name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
