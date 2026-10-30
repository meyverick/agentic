import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Emit, Marker } from "./install.ts";
import { readMarker } from "./install.ts";
import type { Pkg, Targets } from "./pkg.ts";
import { treeHash } from "./tree.ts";

export interface Report {
  version: string;
  orphans: string[];
  missing: string[];
  changed: string[];
  rulebooks: { path: string; matches: boolean }[];
  markers: Marker[];
}

export async function collect(pkg: Pkg, t: Targets): Promise<Report> {
  const report: Report = {
    version: pkg.version,
    orphans: [],
    missing: [],
    changed: [],
    rulebooks: [],
    markers: [],
  };

  const shipped = new Set(pkg.skills.map((skill) => skill.name));
  const installed = new Set<string>();

  if (existsSync(t.skills)) {
    for (const entry of await readdir(t.skills, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(t.skills, entry.name);
      const marker = await readMarker(dir);
      if (!marker) continue;
      report.markers.push(marker);
      installed.add(entry.name);
      if (!shipped.has(entry.name)) report.orphans.push(entry.name);
    }
  }

  for (const skill of pkg.skills) {
    const target = join(t.skills, skill.name);
    if (!installed.has(skill.name)) {
      report.missing.push(skill.name);
      continue;
    }
    const [shippedHash, installedHash] = await Promise.all([
      treeHash(skill.dir),
      treeHash(target),
    ]);
    if (shippedHash !== installedHash) report.changed.push(skill.name);
  }

  const rulebook = await readFile(pkg.rulebook);
  for (const path of t.rulebooks) {
    const matches = existsSync(path) && Buffer.compare(await readFile(path), rulebook) === 0;
    report.rulebooks.push({ path, matches });
  }

  return report;
}

export function drift(report: Report): boolean {
  return (
    report.orphans.length > 0 ||
    report.missing.length > 0 ||
    report.changed.length > 0 ||
    report.rulebooks.some((rulebook) => !rulebook.matches)
  );
}

export function render(report: Report, emit: Emit): void {
  emit(`agentic ${report.version}`);

  const installedVersions = [...new Set(report.markers.map((marker) => marker.version))].sort();
  emit(`installed version${installedVersions.length === 1 ? "" : "s"}  ${installedVersions.join(", ") || "none"}`);

  for (const name of report.orphans) emit(`orphan     ${name}   (marked, no longer shipped)`);
  for (const name of report.missing) emit(`missing    ${name}`);
  for (const name of report.changed) emit(`changed    ${name}   (differs from shipped)`);
  for (const entry of report.rulebooks) {
    emit(`rulebook   ${entry.matches ? "ok      " : "differs "} ${entry.path}`);
  }

  emit(drift(report) ? "drift detected" : "no drift");
}
