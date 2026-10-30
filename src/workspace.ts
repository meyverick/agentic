/** Scaffolds the two-tier workspace described by the rulebook into an empty directory. */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";

import type { Emit } from "./install.ts";
import { updateCli, verifyCli } from "./openspec.ts";

export interface InitOptions {
  force: boolean;
  dryRun: boolean;
  openspec: boolean;
}

async function templateFiles(dir: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await templateFiles(dir, rel)));
    else files.push(rel);
  }
  return files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function render(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => values[key] ?? whole);
}

async function packageVersion(pkgRoot: string): Promise<string> {
  try {
    const manifest = JSON.parse(await readFile(join(pkgRoot, "package.json"), "utf8")) as { version?: string };
    return manifest.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function run(args: string[], cwd: string): { ok: boolean; message: string } {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status === 0) return { ok: true, message: "" };
  const detail = (result.stderr || result.stdout || "").trim().split("\n").slice(-2).join(" ");
  return { ok: false, message: detail || `${args.join(" ")} failed` };
}

function git(args: string[], cwd: string): { ok: boolean; message: string } {
  return run(["git", ...args], cwd);
}

export async function initWorkspace(target: string, pkgRoot: string, opts: InitOptions, emit: Emit): Promise<number> {
  const template = join(pkgRoot, "workspace");
  if (!existsSync(template)) {
    emit(`init       template missing: ${template}`);
    return 1;
  }

  await mkdir(target, { recursive: true });
  const existing = await readdir(target);
  if (existing.length > 0 && !opts.force) {
    for (const entry of existing.slice(0, 5)) emit(`collision  ${join(target, entry)}`);
    emit("refusing to scaffold into a non-empty directory; rerun with --force");
    return 1;
  }

  const files = await templateFiles(template);
  const values: Record<string, string> = {
    project: basename(target).replace(/-workspace$/, ""),
    date: new Date().toISOString().slice(0, 10),
    version: await packageVersion(pkgRoot),
  };

  if (opts.dryRun) {
    for (const file of files) emit(`scaffold   ${file}`);
    if (opts.openspec) emit("scaffold   openspec/   (openspec init --tools none)");
    emit("dry run: nothing written");
    return 0;
  }

  for (const file of files) {
    const path = join(target, ...file.split("/"));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, render(await readFile(join(template, ...file.split("/")), "utf8"), values));
  }
  emit(`scaffold   ${files.length} files`);

  const moduleDir = join(target, "modules");
  const steps: Array<[string, () => { ok: boolean; message: string }]> = [
    ["module repository", () => git(["init", "-q", "-b", "main"], moduleDir)],
    ["module commit", () => git(["add", "-A"], moduleDir)],
    ["module commit", () => git(["commit", "-qm", "chore: scaffold module"], moduleDir)],
    ["workspace repository", () => git(["init", "-q", "-b", "main"], target)],
    [
      "submodule",
      () => git(["-c", "protocol.file.allow=always", "submodule", "add", "-q", "./modules", "modules"], target),
    ],
  ];

  for (const [label, step] of steps) {
    const result = step();
    if (!result.ok) {
      emit(`init       ${label} failed: ${result.message}`);
      emit("init       scaffold left in place; delete the directory and rerun to start over");
      return 1;
    }
  }
  emit("repo       modules/ committed");
  emit("submodule  ./modules registered");

  if (opts.openspec) {
    try {
      updateCli();
      const check = verifyCli();
      emit(`openspec   CLI ${check.version ?? "unknown"} at ${check.path ?? "unresolved"}`);
      if (check.shadowed) emit("openspec   WARN the resolved CLI is not the copy this run updated");
      const created = run(["openspec", "init", "--tools", "none"], target);
      if (!created.ok) {
        emit(`init       openspec init failed: ${created.message}`);
        return 1;
      }
      emit("openspec   initialised (no tools configured)");
    } catch (error) {
      emit(`init       openspec failed: ${(error as Error).message}`);
      return 1;
    }
  } else {
    emit("openspec   skipped (--no-openspec)");
  }

  const committed = git(["add", "-A"], target);
  const commit = committed.ok ? git(["commit", "-qm", "chore: scaffold workspace"], target) : committed;
  if (!commit.ok) {
    emit(`init       workspace commit failed: ${commit.message}`);
    return 1;
  }
  emit("repo       workspace committed");
  emit(`done: ${values.project} scaffolded at ${target}`);
  return 0;
}

export const initRelative = (target: string, path: string): string => relative(target, path).split(sep).join("/");
