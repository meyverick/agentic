import { afterEach, describe, expect, test } from "bun:test";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { install, readMarker } from "../src/install.ts";
import { targets } from "../src/pkg.ts";
import { cleanupScratch, emitter, fixturePackage, put, scratch, snapshot } from "./helpers.ts";

afterEach(cleanupScratch);

const TWO_SKILLS = {
  alpha: { "SKILL.md": "alpha v1", "references/one.md": "one" },
  beta: { "SKILL.md": "beta v1" },
};

const NOOP = { force: false, dryRun: false, openspec: false };

describe("purge", () => {
  test("removes marked orphans and preserves unmarked directories", async () => {
    const root = await scratch("sync");
    const pkg = await fixturePackage(root, TWO_SKILLS);
    const t = targets(join(root, "home"));

    await install(pkg, t, NOOP, emitter().emit);
    await put(join(t.skills, "openspec-explore", "SKILL.md"), "foreign skill");
    const foreign = await snapshot(join(t.skills, "openspec-explore"));

    await put(join(t.skills, "old-skill", "SKILL.md"), "retired");
    await put(join(t.skills, "old-skill", ".agentic"), JSON.stringify({ version: "1.0.0", treeHash: "x" }));

    expect(await install(pkg, t, NOOP, emitter().emit)).toBe(0);

    expect((await readdir(t.skills)).sort()).toEqual(["alpha", "beta", "openspec-explore"]);
    expect(await snapshot(join(t.skills, "openspec-explore"))).toEqual(foreign);
  });
});

describe("placement", () => {
  test("stale files inside a shipped skill are removed by whole-directory replace", async () => {
    const root = await scratch("sync");
    const pkg = await fixturePackage(root, TWO_SKILLS);
    const t = targets(join(root, "home"));

    await install(pkg, t, NOOP, emitter().emit);
    await put(join(t.skills, "alpha", "stale.md"), "should not survive");
    await put(join(t.skills, "alpha", "references", "one.md"), "locally edited");

    await install(pkg, t, NOOP, emitter().emit);

    expect((await readdir(join(t.skills, "alpha"))).sort()).toEqual([".agentic", "SKILL.md", "references"]);
    expect(await Bun.file(join(t.skills, "alpha", "references", "one.md")).text()).toBe("one");
  });
});

describe("collisions", () => {
  test("unmarked directory at a shipped name aborts with no changes, and --force replaces it", async () => {
    const root = await scratch("sync");
    const pkg = await fixturePackage(root, TWO_SKILLS);
    const t = targets(join(root, "home"));
    await put(join(t.skills, "alpha", "SKILL.md"), "hand made");

    const before = await snapshot(join(root, "home"));
    const refused = emitter();
    expect(await install(pkg, t, NOOP, refused.emit)).toBe(1);
    expect(refused.lines.join("\n")).toContain("--force");
    expect(await snapshot(join(root, "home"))).toEqual(before);

    expect(await install(pkg, t, { force: true, dryRun: false, openspec: false }, emitter().emit)).toBe(0);
    expect((await readMarker(join(t.skills, "alpha")))?.version).toBe("9.9.9");
    expect(await Bun.file(join(t.skills, "alpha", "SKILL.md")).text()).toBe("alpha v1");
  });
});

describe("interruption", () => {
  test("resuming after the purge step converges to the uninterrupted result", async () => {
    const root = await scratch("sync");
    const pkg = await fixturePackage(root, TWO_SKILLS);

    const clean = join(root, "clean");
    await install(pkg, targets(clean), NOOP, emitter().emit);
    const expected = await snapshot(clean);

    const resumed = join(root, "resumed");
    const t = targets(resumed);
    await install(pkg, t, NOOP, emitter().emit);
    for (const name of await readdir(t.skills)) {
      await rm(join(t.skills, name), { recursive: true, force: true });
    }
    await install(pkg, t, NOOP, emitter().emit);

    expect(await snapshot(resumed)).toEqual(expected);
  });
});

describe("dry run", () => {
  test("reports the plan and leaves the home untouched", async () => {
    const root = await scratch("sync");
    const pkg = await fixturePackage(root, TWO_SKILLS);
    const t = targets(join(root, "home"));

    const out = emitter();
    expect(await install(pkg, t, { force: false, dryRun: true, openspec: false }, out.emit)).toBe(0);

    expect(await snapshot(join(root, "home"))).toEqual([]);
    expect(out.lines.join("\n")).toContain("add      alpha");
    expect(out.lines.join("\n")).toContain("dry run");
  });
});
