import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { initWorkspace } from "../src/workspace.ts";

const PKG_ROOT = join(import.meta.dir, "..");
const EPIGRAPH = "> *Architected and directed by Human Intelligence, **implemented by AI**.*";
const NO_OPENSPEC = { force: false, dryRun: false, openspec: false, codegraph: false };

let roots: string[] = [];
let scaffold: string;

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "workspace-init-"));
  roots.push(dir);
  return dir;
}

function git(dir: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

beforeAll(async () => {
  process.env.GIT_AUTHOR_NAME = "test";
  process.env.GIT_AUTHOR_EMAIL = "test@example.com";
  process.env.GIT_COMMITTER_NAME = "test";
  process.env.GIT_COMMITTER_EMAIL = "test@example.com";
  scaffold = join(scratch(), "demo-workspace");
  const code = await initWorkspace(scaffold, PKG_ROOT, NO_OPENSPEC, () => undefined);
  expect(code).toBe(0);
});

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

describe("scaffold layout", () => {
  test("both tiers carry the rulebook's artifacts", () => {
    for (const path of [
      "README.md",
      "wiki/index.md",
      "wiki/01-getting-started.md",
      "wiki/04-mastery-and-extension.md",
      "references/.gitkeep",
      "scripts/check.ts",
      "modules/README.md",
      "modules/wiki/index.md",
      "modules/CHANGELOG.md",
      "modules/scripts/check.ts",
    ]) {
      expect(existsSync(join(scaffold, path))).toBe(true);
    }
  });

  test("the project name is substituted without the workspace suffix", () => {
    expect(readFileSync(join(scaffold, "README.md"), "utf8")).toContain("# demo\n");
  });

  test("every README starts with the epigraph and carries no fenced block", () => {
    for (const rel of ["README.md", "modules/README.md"]) {
      const text = readFileSync(join(scaffold, rel), "utf8");
      const [first, second, third] = text.split("\n");
      expect(first).toBe(EPIGRAPH);
      expect(second).toBe("");
      expect(third.startsWith("# ")).toBe(true);
      expect(/^```/m.test(text)).toBe(false);
    }
  });

  test("wiki pages carry documentation frontmatter and are tracked", () => {
    expect(readFileSync(join(scaffold, "wiki/01-getting-started.md"), "utf8")).toStartWith('---\nokf_version: "0.2"');
    expect(git(scaffold, "ls-files", "wiki").split("\n").filter(Boolean).length).toBeGreaterThan(0);
  });

  test("no artifact owned by another tool is written", () => {
    expect(existsSync(join(scaffold, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(scaffold, ".github/FUNDING.yml"))).toBe(false);
    expect(existsSync(join(scaffold, "DEPENDENCIES.md"))).toBe(false);
  });
});

describe("repository wiring", () => {
  test("the pointer is clean and relative", () => {
    expect(git(scaffold, "submodule", "status").trim()).not.toStartWith("+");
    expect(git(scaffold, "submodule", "status").trim()).not.toStartWith("-");
    expect(readFileSync(join(scaffold, ".gitmodules"), "utf8")).toContain("url = ./modules");
  });

  test("the module has its own commit and the workspace has one", () => {
    expect(git(join(scaffold, "modules"), "log", "--oneline").trim().split("\n")).toHaveLength(1);
    expect(git(scaffold, "log", "--oneline").trim().split("\n")).toHaveLength(1);
    expect(git(scaffold, "status", "--porcelain").trim()).toBe("");
  });
});

describe("gate state", () => {
  test("the module gate names its unconfigured native lane", () => {
    const result = spawnSync("bun", ["modules/scripts/check.ts", "--quick"], { cwd: scaffold, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("slot 3: unconfigured");
  });

  test("the orchestrator gate refuses to pass through a failing module", () => {
    const result = spawnSync("bun", ["scripts/check.ts", "--quick"], { cwd: scaffold, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("submodule gate failed: modules");
  });
});

describe("code graph lane", () => {
  test("the opt-out leaves no index and no openspec directory", () => {
    expect(existsSync(join(scaffold, ".codegraph"))).toBe(false);
    expect(existsSync(join(scaffold, "openspec"))).toBe(false);
  });

  // ponytail: the lane installs a global package and indexes; run it on demand, not on every gate.
  const integration = Boolean(Bun.which("codegraph")) && process.env.AGENTIC_TEST_TOOLING === "1";
  test.skipIf(!integration)("an enabled lane builds an index and commits none of it", async () => {
    const target = join(scratch(), "with-graph");
    const code = await initWorkspace(target, PKG_ROOT, { ...NO_OPENSPEC, codegraph: true }, () => undefined);

    expect(code).toBe(0);
    expect(existsSync(join(target, ".codegraph", "codegraph.db"))).toBe(true);
    expect(git(target, "ls-files").includes(".codegraph")).toBe(false);
  });
});

describe("dry run and refusals", () => {
  test("a dry run lists the scaffold and writes nothing", async () => {
    const target = join(scratch(), "dry");
    const lines: string[] = [];
    const code = await initWorkspace(target, PKG_ROOT, { ...NO_OPENSPEC, dryRun: true }, (line) => lines.push(line));

    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("scaffold   README.md");
    expect(lines.join("\n")).toContain("dry run");
    expect(existsSync(join(target, "README.md"))).toBe(false);
  });

  test("a non-empty directory is refused and left untouched", async () => {
    const target = scratch();
    writeFileSync(join(target, "keep.txt"), "x");
    const lines: string[] = [];

    const code = await initWorkspace(target, PKG_ROOT, NO_OPENSPEC, (line) => lines.push(line));

    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("collision");
    expect(existsSync(join(target, "README.md"))).toBe(false);
    expect(existsSync(join(target, "keep.txt"))).toBe(true);
  });
});
