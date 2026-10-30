import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { changedPaths, checkModuleDensity, moduleLines } from "./loc-lane.ts";

let roots: string[] = [];

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "loc-lane-"));
  roots.push(root);
  const identity = ["-c", "user.email=t@example.com", "-c", "user.name=t"];
  execFileSync("git", ["init", "-q", root], { stdio: "pipe" });
  writeFileSync(join(root, "base.txt"), "base\n");
  execFileSync("git", [...identity, "-C", root, "add", "-A"], { stdio: "pipe" });
  execFileSync("git", [...identity, "-C", root, "commit", "-qm", "base"], { stdio: "pipe" });
  return root;
}

function module(root: string, rel: string, count: number, firstLine?: string): string {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  const body = Array.from({ length: count }, (_, index) => `export const v${index} = ${index};`);
  if (firstLine) body[0] = firstLine;
  writeFileSync(path, `${body.join("\n")}\n`);
  return path;
}

function stage(root: string, rel: string): void {
  execFileSync("git", ["-C", root, "add", "-f", rel], { stdio: "pipe" });
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

describe("moduleLines", () => {
  test("counts physical lines without double-counting a trailing newline", () => {
    const root = repo();
    expect(moduleLines(module(root, "a.ts", 7))).toBe(7);
  });
});

describe("changed-set resolver", () => {
  test("sees staged and modified files, ignores untouched ones", () => {
    const root = repo();
    module(root, "gone.ts", 3);
    module(root, "staged.ts", 3);
    stage(root, "staged.ts");
    module(root, "untracked.ts", 3);

    const paths = changedPaths(root) ?? [];
    expect(paths).toContain("staged.ts");
    expect(paths).not.toContain("untracked.ts");
    expect(paths).not.toContain("gone.ts");
  });

  test("a directory without git history is undeterminable", () => {
    const root = mkdtempSync(join(tmpdir(), "loc-lane-bare-"));
    roots.push(root);
    writeFileSync(join(root, "x.ts"), "x\n");
    expect(changedPaths(root)).toBeNull();
    expect(checkModuleDensity(root).undeterminable).toBe(true);
  });
});

describe("density bands", () => {
  test("a staged module over the hard ceiling fails", () => {
    const root = repo();
    module(root, "big.ts", 501);
    stage(root, "big.ts");

    const report = checkModuleDensity(root);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]).toContain("501 lines");
  });

  test("an untracked module over the ceiling is ignored", () => {
    const root = repo();
    module(root, "loose.ts", 501);

    const report = checkModuleDensity(root);
    expect(report.failures).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  test("a staged module in the warning band warns without failing", () => {
    const root = repo();
    module(root, "warn.ts", 350);
    stage(root, "warn.ts");

    const report = checkModuleDensity(root);
    expect(report.failures).toEqual([]);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toContain("350 lines");
  });

  test("a module at the warning ceiling stays silent", () => {
    const root = repo();
    module(root, "ok.ts", 300);
    stage(root, "ok.ts");

    const report = checkModuleDensity(root);
    expect(report.failures).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.measured).toBeGreaterThanOrEqual(1);
  });
});

describe("exemptions", () => {
  test("a marker naming an existing record exempts the module", () => {
    const root = repo();
    mkdirSync(join(root, "wiki", "adr"), { recursive: true });
    writeFileSync(join(root, "wiki", "adr", "0001-why.md"), "# why\n");
    module(root, "machine.ts", 501, "// loc-exempt: wiki/adr/0001-why.md");
    stage(root, "machine.ts");

    const report = checkModuleDensity(root);
    expect(report.failures).toEqual([]);
    expect(report.warnings.some((warning) => warning.includes("exempted"))).toBe(true);
  });

  test("a marker naming a missing record fails", () => {
    const root = repo();
    module(root, "machine.ts", 501, "// loc-exempt: wiki/adr/does-not-exist.md");
    stage(root, "machine.ts");

    const report = checkModuleDensity(root);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]).toContain("exemption record is missing");
  });

  test("no marker and no record fails", () => {
    const root = repo();
    module(root, "machine.ts", 501);
    stage(root, "machine.ts");

    expect(checkModuleDensity(root).failures[0]).toContain("decompose before completing the task");
  });
});
