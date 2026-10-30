import { afterEach, describe, expect, test } from "bun:test";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { install } from "../src/install.ts";
import { targets } from "../src/pkg.ts";
import { collect, drift, render } from "../src/status.ts";
import { cleanupScratch, emitter, fixturePackage, put, scratch } from "./helpers.ts";

afterEach(cleanupScratch);

const TWO_SKILLS = {
  alpha: { "SKILL.md": "alpha v1" },
  beta: { "SKILL.md": "beta v1" },
};

const NOOP = { force: false, dryRun: false, openspec: false };

async function installed(prefix: string) {
  const root = await scratch(prefix);
  const pkg = await fixturePackage(root, TWO_SKILLS);
  const t = targets(join(root, "home"));
  await install(pkg, t, NOOP, emitter().emit);
  return { root, pkg, t };
}

describe("status", () => {
  test("a freshly installed home reports no drift", async () => {
    const { pkg, t } = await installed("status");
    const report = await collect(pkg, t);

    expect(drift(report)).toBe(false);
    expect(report.changed).toEqual([]);
    expect(report.missing).toEqual([]);
    expect(report.orphans).toEqual([]);
    expect(report.rulebooks.every((entry) => entry.matches)).toBe(true);
  });

  test("a locally edited skill is reported by name", async () => {
    const { pkg, t } = await installed("status");
    await put(join(t.skills, "alpha", "SKILL.md"), "locally edited");

    const report = await collect(pkg, t);
    const out = emitter();
    render(report, out.emit);

    expect(drift(report)).toBe(true);
    expect(report.changed).toEqual(["alpha"]);
    expect(out.lines.join("\n")).toContain("changed    alpha");
    expect(out.lines.join("\n")).toContain("drift detected");
  });

  test("orphaned marked skills, missing skills and divergent rulebooks are reported", async () => {
    const { pkg, t } = await installed("status");
    await rm(join(t.skills, "beta"), { recursive: true, force: true });
    await put(join(t.skills, "retired", "SKILL.md"), "old");
    await put(join(t.skills, "retired", ".agentic"), JSON.stringify({ version: "1.0.0", treeHash: "x" }));
    await put(t.rulebooks[0], "DRIFTED\n");

    const report = await collect(pkg, t);
    expect(report.orphans).toEqual(["retired"]);
    expect(report.missing).toEqual(["beta"]);
    expect(report.rulebooks[0].matches).toBe(false);
    expect(drift(report)).toBe(true);
    expect((await readdir(t.skills)).length).toBe(2);
  });
});
