import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { findPackageRoot, loadPackage } from "../src/pkg.ts";
import { cleanupScratch, fixturePackage, put, scratch } from "./helpers.ts";

afterEach(cleanupScratch);

describe("package root resolution", () => {
  test("walk finds the own package from the bin directory and from a deeper path", async () => {
    const root = await scratch("pkg");
    await put(join(root, "package.json"), JSON.stringify({ name: "@meyverick/agentic", version: "1.0.0" }));
    await mkdir(join(root, "src", "deep"), { recursive: true });

    expect(await findPackageRoot(join(root, "src"), "@meyverick/agentic")).toBe(root);
    expect(await findPackageRoot(join(root, "src", "deep"), "@meyverick/agentic")).toBe(root);
    expect(await findPackageRoot(root, "@meyverick/agentic")).toBe(root);
  });

  test("walk ignores foreign manifests and fails when the own package is absent", async () => {
    const root = await scratch("pkg");
    await put(join(root, "package.json"), JSON.stringify({ name: "some-other-package" }));
    await mkdir(join(root, "src"), { recursive: true });

    await expect(findPackageRoot(join(root, "src"), "@meyverick/agentic")).rejects.toThrow(/not found/);
  });
});

describe("shipped skill enumeration", () => {
  test("reflects directory additions and removals without a source change", async () => {
    const root = await scratch("pkg");
    const pkg = await fixturePackage(root, { alpha: { "SKILL.md": "a" }, beta: { "SKILL.md": "b" } });
    expect(pkg.skills.map((skill) => skill.name)).toEqual(["alpha", "beta"]);
    expect(pkg.version).toBe("9.9.9");

    await mkdir(join(root, "pkg", "skills", "gamma"), { recursive: true });
    await put(join(root, "pkg", "skills", "gamma", "SKILL.md"), "g");
    const grown = await loadPackage(join(root, "pkg", "skills"));
    expect(grown.skills.map((skill) => skill.name)).toEqual(["alpha", "beta", "gamma"]);

    await rm(join(root, "pkg", "skills", "alpha"), { recursive: true, force: true });
    const shrunk = await loadPackage(join(root, "pkg", "skills"));
    expect(shrunk.skills.map((skill) => skill.name)).toEqual(["beta", "gamma"]);
  });

  test("a directory without SKILL.md is not part of the shipped set", async () => {
    const root = await scratch("pkg");
    await fixturePackage(root, { alpha: { "SKILL.md": "a" } });
    await mkdir(join(root, "pkg", "skills", "notes"), { recursive: true });
    await put(join(root, "pkg", "skills", "notes", "readme.txt"), "not a skill");

    const reloaded = await loadPackage(join(root, "pkg", "skills"));
    expect(reloaded.skills.map((skill) => skill.name)).toEqual(["alpha"]);
    expect((await readdir(join(root, "pkg", "skills"))).length).toBe(2);
  });
});
