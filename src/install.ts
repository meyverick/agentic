import { existsSync } from "node:fs";
import { readdir, readFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Pkg, Skill, Targets } from "./pkg.ts";
import type { Bundle } from "./openspec.ts";
import { placeBundles, prepare, purgeMarked as purgeOpenSpec } from "./openspec.ts";
import { copyTree, MARKER, treeHash } from "./tree.ts";

export interface Options {
  force: boolean;
  dryRun: boolean;
  openspec: boolean;
}

export interface Marker {
  version: string;
  treeHash: string;
}

export interface Place {
  skill: Skill;
  wasOurs: boolean;
}

export interface Plan {
  rulebooks: string[];
  purge: string[];
  place: Place[];
  collisions: string[];
}

export type Emit = (line: string) => void;

const markerPath = (dir: string): string => join(dir, MARKER);

export async function readMarker(dir: string): Promise<Marker | null> {
  try {
    return JSON.parse(await readFile(markerPath(dir), "utf8")) as Marker;
  } catch {
    return null;
  }
}

export async function preflight(pkg: Pkg): Promise<void> {
  if (!existsSync(pkg.rulebook) || (await stat(pkg.rulebook)).size === 0) {
    throw new Error(`packaged rulebook missing or empty: ${pkg.rulebook}`);
  }
  if (pkg.skills.length === 0) {
    throw new Error(`no shipped skills found in ${join(pkg.root, "skills")}`);
  }
}

export async function buildPlan(pkg: Pkg, t: Targets): Promise<Plan> {
  const plan: Plan = { rulebooks: t.rulebooks, purge: [], place: [], collisions: [] };

  const marked = new Set<string>();
  if (existsSync(t.skills)) {
    for (const entry of await readdir(t.skills, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(t.skills, entry.name);
      if (existsSync(markerPath(dir))) {
        marked.add(entry.name);
        plan.purge.push(dir);
      }
    }
  }

  for (const skill of pkg.skills) {
    const target = join(t.skills, skill.name);
    const wasOurs = marked.has(skill.name);
    if (existsSync(target) && !wasOurs) plan.collisions.push(target);
    plan.place.push({ skill, wasOurs });
  }

  return plan;
}

export async function install(pkg: Pkg, t: Targets, opts: Options, emit: Emit): Promise<number> {
  await preflight(pkg);
  const plan = await buildPlan(pkg, t);

  if (plan.collisions.length > 0 && !opts.force) {
    for (const path of plan.collisions) emit(`collision  ${path}`);
    emit("refusing to replace unmarked directories; rerun with --force to hand ownership over");
    return 1;
  }

  if (opts.dryRun) {
    for (const path of plan.rulebooks) emit(`rulebook   ${path}`);
    for (const path of plan.purge) emit(`delete     ${path}`);
    for (const { skill, wasOurs } of plan.place) {
      emit(`${wasOurs ? "replace" : "add"}      ${skill.name}`);
    }
    if (plan.collisions.length > 0) emit("note       --force would replace the collisions above");
    emit("dry run: nothing written");
    return 0;
  }

  // Acquisition happens before the first write: a failed download or CLI update must cost nothing.
  let bundles: Bundle[] = [];
  if (opts.openspec) {
    try {
      bundles = await prepare(t, opts.force, emit);
    } catch (error) {
      emit(`openspec   ${(error as Error).message}`);
      return 1;
    }
  } else {
    emit("openspec   skipped (--no-openspec)");
  }

  const rulebook = await readFile(pkg.rulebook);
  for (const path of plan.rulebooks) {
    await rm(path, { force: true });
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, rulebook);
    emit(`rulebook   ${path}`);
  }

  for (const dir of plan.purge) await rm(dir, { recursive: true, force: true });

  await mkdir(t.skills, { recursive: true });
  for (const { skill } of plan.place) {
    const target = join(t.skills, skill.name);
    await rm(target, { recursive: true, force: true });
    await copyTree(skill.dir, target);
    const marker: Marker = { version: pkg.version, treeHash: await treeHash(skill.dir) };
    await writeFile(markerPath(target), `${JSON.stringify(marker, null, 2)}\n`);
    emit(`installed  ${skill.name}`);
  }

  if (bundles.length > 0) {
    const removed = await purgeOpenSpec(t.skills);
    if (removed.length > 0) emit(`openspec   removed ${removed.length} stale skills`);
    await placeBundles(bundles, t.skills, emit);
  }

  emit(`done: ${plan.place.length} skills, ${plan.rulebooks.length} rulebooks`);
  return 0;
}
