import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { install, readMarker } from "../src/install.ts";
import { targets } from "../src/pkg.ts";
import { treeHash } from "../src/tree.ts";
import { cleanupScratch, emitter, fixturePackage, put, scratch, snapshot } from "./helpers.ts";

afterEach(cleanupScratch);

const TWO_SKILLS = {
  alpha: { "SKILL.md": "alpha v1", "references/one.md": "one" },
  beta: { "SKILL.md": "beta v1" },
};

describe("pre-flight", () => {
  test("empty shipped set fails before touching the home", async () => {
    const root = await scratch("install");
    const pkg = await fixturePackage(root, {});
    const home = join(root, "home");
    const before = await snapshot(home);

    await expect(install(pkg, targets(home), { force: false, dryRun: false }, emitter().emit)).rejects.toThrow(
      /no shipped skills/,
    );
    expect(await snapshot(home)).toEqual(before);
  });
});

describe("rulebook replacement", () => {
  test("divergent rulebook is overwritten and a missing one is created", async () => {
    const root = await scratch("install");
    const pkg = await fixturePackage(root, TWO_SKILLS);
    const t = targets(join(root, "home"));
    await put(t.rulebooks[0], "STALE RULEBOOK\n");

    expect(await install(pkg, t, { force: false, dryRun: false }, emitter().emit)).toBe(0);
    for (const path of t.rulebooks) {
      expect(await Bun.file(path).text()).toBe("RULEBOOK v1\n");
    }
  });
});

describe("marker and hashing", () => {
  test("every installed skill carries a matching marker", async () => {
    const root = await scratch("install");
    const pkg = await fixturePackage(root, TWO_SKILLS);
    const t = targets(join(root, "home"));

    await install(pkg, t, { force: false, dryRun: false }, emitter().emit);

    for (const skill of pkg.skills) {
      const marker = await readMarker(join(t.skills, skill.name));
      expect(marker?.version).toBe("9.9.9");
      expect(marker?.treeHash).toBe(await treeHash(skill.dir));
    }
  });
});
