/** OpenSpec CLI + skill lane: acquire upstream, then place with a distinct ownership marker. */
import { homedir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

import type { Targets } from "./pkg.ts";

export const MARKER = ".openspec";
export const MARKER_CONTENT = "openspec\n";
export const DEFAULT_SOURCE = "https://codeload.github.com/Fission-AI/OpenSpec/tar.gz/refs/heads/main";
export const CLI_PACKAGE = "@fission-ai/openspec@latest";

export interface BundleFile {
  path: string;
  bytes: Uint8Array;
}

export interface Bundle {
  name: string;
  files: BundleFile[];
}

export type Emit = (line: string) => void;

const sourceUrl = (): string => process.env.AGENTIC_OPENSPEC_URL || DEFAULT_SOURCE;

/** Groups `<root>/skills/<name>/**` entries into bundles; other paths are ignored. */
export async function bundlesFromEntries(entries: Array<[string, Blob]>): Promise<Bundle[]> {
  const bundles = new Map<string, BundleFile[]>();
  for (const [path, blob] of entries) {
    const parts = path.split("/");
    if (parts.length < 4 || parts[1] !== "skills") continue;
    const rel = parts.slice(3).join("/");
    if (!rel || rel.endsWith("/")) continue;
    const files = bundles.get(parts[2]) ?? [];
    files.push({ path: rel, bytes: new Uint8Array(await blob.arrayBuffer()) });
    bundles.set(parts[2], files);
  }
  return [...bundles.entries()]
    .map(([name, files]) => ({ name, files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

export async function fetchBundles(url = sourceUrl()): Promise<Bundle[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`upstream download failed: HTTP ${response.status} from ${url}`);
  const archive = new Bun.Archive(new Uint8Array(await response.arrayBuffer()));
  return bundlesFromEntries([...(await archive.files()).entries()]);
}

/** Test seam: reads `<dir>/<skill>/...` from disk instead of the network. */
export async function bundlesFromDir(dir: string): Promise<Bundle[]> {
  const bundles: Bundle[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const root = join(dir, entry.name);
    const files: BundleFile[] = [];
    const walk = async (current: string): Promise<void> => {
      for (const child of await readdir(current, { withFileTypes: true })) {
        const path = join(current, child.name);
        if (child.isDirectory()) await walk(path);
        else files.push({ path: relative(root, path).split(sep).join("/"), bytes: new Uint8Array(await Bun.file(path).arrayBuffer()) });
      }
    };
    await walk(root);
    bundles.push({ name: entry.name, files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) });
  }
  return bundles.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

export function updateCli(): void {
  const result = spawnSync("bun", ["add", "-g", CLI_PACKAGE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    throw new Error(`openspec CLI update failed: ${(result.stderr || result.stdout || "").trim().split("\n")[0]}`);
  }
}

export interface CliCheck {
  path: string | null;
  version: string | null;
  shadowed: boolean;
}

export function verifyCli(): CliCheck {
  const resolved = Bun.which("openspec");
  if (!resolved) return { path: null, version: null, shadowed: false };
  // A .cmd shim cannot be spawned directly on Windows; let the shell resolve it there.
  const probe = spawnSync(resolved, ["--version"], {
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const version = probe.stdout?.trim() || null;
  let shadowed = false;
  try {
    shadowed = realpathSync(dirname(resolved)) !== realpathSync(join(homedir(), ".bun", "bin"));
  } catch {
    shadowed = true;
  }
  return { path: resolved, version, shadowed };
}

export async function purgeMarked(skillsRoot: string, marker = MARKER): Promise<string[]> {
  const removed: string[] = [];
  if (!existsSync(skillsRoot)) return removed;
  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(skillsRoot, entry.name);
    if (!existsSync(join(dir, marker))) continue;
    await rm(dir, { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed;
}

/** Skill names already occupied by a directory the OpenSpec lane does not own. */
export function findCollisions(bundles: Bundle[], skillsRoot: string): string[] {
  return bundles
    .map((bundle) => join(skillsRoot, bundle.name))
    .filter((target) => existsSync(target) && !existsSync(join(target, MARKER)));
}

export async function placeBundles(bundles: Bundle[], skillsRoot: string, emit: Emit): Promise<string[]> {
  const placed: string[] = [];
  await mkdir(skillsRoot, { recursive: true });
  for (const bundle of bundles) {
    const target = join(skillsRoot, bundle.name);
    await rm(target, { recursive: true, force: true });
    for (const file of bundle.files) {
      const path = join(target, ...file.path.split("/"));
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.bytes);
    }
    await writeFile(join(target, MARKER), MARKER_CONTENT);
    emit(`openspec   ${bundle.name}`);
    placed.push(bundle.name);
  }
  return placed;
}

/** Anything that must be known before the run mutates the machine. */
export async function prepare(t: Targets, force: boolean, emit: Emit): Promise<Bundle[]> {
  const bundles = await fetchBundles();
  if (bundles.length === 0) throw new Error(`upstream source contained no skills: ${sourceUrl()}`);

  const collisions = findCollisions(bundles, t.skills);
  if (collisions.length > 0 && !force) {
    for (const path of collisions) emit(`collision  ${path}`);
    throw new Error("unmarked directories occupy OpenSpec skill names; rerun with --force");
  }

  updateCli();
  const check = verifyCli();
  emit(`openspec   CLI ${check.version ?? "unknown"} at ${check.path ?? "unresolved"}`);
  if (check.shadowed) emit(`openspec   WARN ${basename(check.path ?? "")} resolves ahead of the updated copy in ${join(homedir(), ".bun", "bin")}`);
  return bundles;
}
