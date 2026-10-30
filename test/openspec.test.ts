import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { bundlesFromDir, findCollisions, MARKER, placeBundles, purgeMarked } from "../src/openspec.ts";
import { install } from "../src/install.ts";
import { targets } from "../src/pkg.ts";
import { emitter, fixturePackage, snapshot } from "./helpers.ts";

let roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), "openspec-"));
  roots.push(root);
  return root;
}

function upstream(skills: Record<string, Record<string, string>>): string {
  const root = scratch();
  for (const [name, files] of Object.entries(skills)) {
    for (const [file, content] of Object.entries(files)) {
      const path = join(root, name, file);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, content);
    }
  }
  writeFileSync(join(root, "README.md"), "not a skill\n");
  return root;
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

describe("upstream bundle assembly", () => {
  test("reads skill directories and ignores loose files", async () => {
    const dir = upstream({
      "openspec-alpha": { "SKILL.md": "a", "references/one.md": "one" },
      "openspec-beta": { "SKILL.md": "b" },
    });

    const bundles = await bundlesFromDir(dir);
    expect(bundles.map((bundle) => bundle.name)).toEqual(["openspec-alpha", "openspec-beta"]);
    expect(bundles[0].files.map((file) => file.path)).toEqual(["SKILL.md", "references/one.md"]);
  });
});

describe("purge", () => {
  test("removes only the marked class", async () => {
    const root = scratch();
    for (const [name, marker] of [["ours", ".agentic"], ["theirs", ".openspec"], ["foreign", null]] as const) {
      mkdirSync(join(root, name), { recursive: true });
      writeFileSync(join(root, name, "SKILL.md"), name);
      if (marker) writeFileSync(join(root, name, marker), "x");
    }

    expect(await purgeMarked(root)).toEqual(["theirs"]);
    expect(readdirSync(root).sort()).toEqual(["foreign", "ours"]);
  });
});

describe("placement", () => {
  test("writes files and the marker upstream expects", async () => {
    const root = scratch();
    const bundles = await bundlesFromDir(upstream({ "openspec-alpha": { "SKILL.md": "a", "references/one.md": "one" } }));

    await placeBundles(bundles, root, () => undefined);

    expect(existsSync(join(root, "openspec-alpha", "references", "one.md"))).toBe(true);
    expect(await Bun.file(join(root, "openspec-alpha", MARKER)).text()).toBe("openspec\n");
    expect(existsSync(join(root, "README.md"))).toBe(false);
  });

  test("a retired upstream skill disappears on the next run", async () => {
    const root = scratch();
    const before = await bundlesFromDir(upstream({ "openspec-alpha": { "SKILL.md": "a" }, "openspec-gone": { "SKILL.md": "g" } }));
    await placeBundles(before, root, () => undefined);

    const after = await bundlesFromDir(upstream({ "openspec-alpha": { "SKILL.md": "a" } }));
    await purgeMarked(root);
    await placeBundles(after, root, () => undefined);

    expect(readdirSync(root)).toEqual(["openspec-alpha"]);
  });

  test("two runs produce the same tree", async () => {
    const root = scratch();
    const bundles = await bundlesFromDir(upstream({ "openspec-alpha": { "SKILL.md": "a" } }));

    await placeBundles(bundles, root, () => undefined);
    const first = await snapshot(root);
    await purgeMarked(root);
    await placeBundles(bundles, root, () => undefined);

    expect(await snapshot(root)).toEqual(first);
  });
});

describe("collisions", () => {
  test("an unmarked directory at a shipped name is reported, marked ones are not", () => {
    const root = scratch();
    mkdirSync(join(root, "openspec-alpha"), { recursive: true });
    mkdirSync(join(root, "openspec-beta"), { recursive: true });
    writeFileSync(join(root, "openspec-beta", MARKER), "openspec\n");

    const collisions = findCollisions(
      [
        { name: "openspec-alpha", files: [] },
        { name: "openspec-beta", files: [] },
      ],
      root,
    );
    expect(collisions).toEqual([join(root, "openspec-alpha")]);
  });
});

describe("acquire before mutate", () => {
  test("an unreachable source exits non-zero and leaves the home untouched", async () => {
    const root = scratch();
    const pkg = await fixturePackage(root, { alpha: { "SKILL.md": "a" } });
    const home = join(root, "home");
    const before = await snapshot(home);
    process.env.AGENTIC_OPENSPEC_URL = "https://127.0.0.1:9/openspec.tar.gz";

    const out = emitter();
    const code = await install(pkg, targets(home), { force: false, dryRun: false, openspec: true }, out.emit);
    delete process.env.AGENTIC_OPENSPEC_URL;

    expect(code).toBe(1);
    expect(await snapshot(home)).toEqual(before);
    expect(out.lines.join("\n")).toContain("openspec");
  });

  test("the opt-out skips the lane entirely", async () => {
    const root = scratch();
    const pkg = await fixturePackage(root, { alpha: { "SKILL.md": "a" } });
    const home = join(root, "home");
    process.env.AGENTIC_OPENSPEC_URL = "https://127.0.0.1:9/openspec.tar.gz";

    const out = emitter();
    const code = await install(pkg, targets(home), { force: false, dryRun: false, openspec: false }, out.emit);
    delete process.env.AGENTIC_OPENSPEC_URL;

    expect(code).toBe(0);
    expect(existsSync(join(home, ".agents", "skills", "alpha", "SKILL.md"))).toBe(true);
    expect(out.lines.join("\n")).toContain("skipped (--no-openspec)");
  });
});
