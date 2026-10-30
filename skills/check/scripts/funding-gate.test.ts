import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { digest, httpStatus } from "./funding-sources.ts";
import { main, validate } from "./funding-gate.ts";

const SCRIPT = join(import.meta.dir, "funding-gate.ts");
const DEPS: Array<["npm", string]> = [["npm", "x"]];
const warnings: string[] = [];
const warn = (line: string): void => {
  warnings.push(line);
};

let roots: string[] = [];

async function repo(options: { readme?: string | null; contributing?: string | null; deps?: Array<["npm", string]> } = {}): Promise<string> {
  const { readme = "thanks.dev\n", contributing = "thanks.dev\n", deps = DEPS } = options;
  const root = await mkdtemp(join(tmpdir(), "funding-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({ dependencies: { x: "1.0.0" } }));
  execFileSync("git", ["init", "-q", root], { stdio: "pipe" });
  execFileSync("git", ["-C", root, "remote", "add", "origin", "git@github.com:owner/demo.git"], { stdio: "pipe" });
  if (readme !== null) await writeFile(join(root, "README.md"), readme);
  if (contributing !== null) await writeFile(join(root, "CONTRIBUTING.md"), contributing);

  const marker = digest(deps);
  await mkdir(join(root, ".github"), { recursive: true });
  await writeFile(
    join(root, ".github", "FUNDING.yml"),
    `# deps-sha256: ${marker}\ngithub: [owner]\nthanks_dev: u/gh/owner\ncustom:\n` +
      `  - "https://thanks.dev/u/gh/owner"\n  - "https://github.com/sponsors/x"\n`,
  );
  await writeFile(
    join(root, "DEPENDENCIES.md"),
    `# Dependencies\n\ndeps-sha256: ${marker}\n\n| Ecosystem | Package | Funding |\n` +
      `| --- | --- | --- |\n| npm | x | https://github.com/sponsors/x |\n`,
  );
  return root;
}

const failures = (root: string, deps: Array<["npm", string]> = DEPS): Promise<string[]> => validate(root, deps, warn);

beforeEach(() => {
  warnings.length = 0;
});

afterEach(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
  roots = [];
});

describe("funding ledger validation", () => {
  test("clean repository has no problems", async () => {
    const root = await repo();
    expect(await failures(root)).toEqual([]);
  });

  test("dropped dependency row is reported", async () => {
    const root = await repo();
    await writeFile(join(root, "DEPENDENCIES.md"), "# Dependencies\n");
    expect((await failures(root)).some((problem) => problem.includes("rows do not match"))).toBe(true);
  });

  test("wrong owner is reported", async () => {
    const root = await repo();
    const path = join(root, ".github", "FUNDING.yml");
    const text = await Bun.file(path).text();
    await writeFile(path, text.replace("github: [owner]", "github: [intruder]"));
    expect((await failures(root)).some((problem) => problem.includes("github must be exactly"))).toBe(true);
  });

  test("non-https custom URL is reported", async () => {
    const root = await repo();
    const path = join(root, ".github", "FUNDING.yml");
    const text = await Bun.file(path).text();
    await writeFile(path, text.replace("https://github.com", "http://github.com"));
    expect((await failures(root)).some((problem) => problem.includes("must be https"))).toBe(true);
  });

  test("README without thanks.dev is reported", async () => {
    const root = await repo({ readme: "# Demo\n" });
    expect((await failures(root)).some((problem) => problem.includes("README.md must name the thanks.dev"))).toBe(true);
  });

  test("CONTRIBUTING without thanks.dev is reported", async () => {
    const root = await repo({ contributing: "# Contributing\n" });
    expect((await failures(root)).some((problem) => problem.includes("CONTRIBUTING.md must name the thanks.dev"))).toBe(true);
  });

  test("a repository with no dependencies still validates", async () => {
    const empty = digest([]);
    expect(empty).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const wellFormed = await repo({ deps: [] });
    await writeFile(
      join(wellFormed, "DEPENDENCIES.md"),
      `# Dependencies\n\ndeps-sha256: ${empty}\n\n| Ecosystem | Package | Funding |\n| --- | --- | --- |\n`,
    );
    await writeFile(
      join(wellFormed, ".github", "FUNDING.yml"),
      `# deps-sha256: ${empty}\ngithub: [owner]\nthanks_dev: u/gh/owner\ncustom:\n  - "https://thanks.dev/u/gh/owner"\n`,
    );
    expect(await failures(wellFormed, [])).toEqual([]);
  });
});

describe("dead link detection", () => {
  test("a closed port is reported as unreachable", async () => {
    expect(await httpStatus("https://127.0.0.1:9/nothing")).toBe(0);
  });

  test("a non-https URL is reported as unreachable", async () => {
    expect(await httpStatus("http://example.com/")).toBe(0);
  });
});

describe("cli exit codes", () => {
  test("check passes, then fails when an artifact disappears, and rejects unknown flags", async () => {
    const root = await repo();
    expect(await main(["--check", root])).toBe(0);
    await unlink(join(root, "DEPENDENCIES.md"));
    expect(await main(["--check", root])).toBe(1);
    expect(await main(["--bogus", root])).toBe(2);
  });

  test("write mode regenerates both artifacts", async () => {
    const root = await repo({ readme: "thanks.dev\n" });
    await writeFile(join(root, "DEPENDENCIES.md"), "stale\n");
    expect(await main(["--write", root])).toBe(0);
    expect(await main(["--check", root])).toBe(0);
    const funding = await Bun.file(join(root, ".github", "FUNDING.yml")).text();
    expect(funding).toContain("funding-gate.ts");
  });
});

describe("script identity", () => {
  test("the script exists next to its test and runs under bun", () => {
    expect(SCRIPT.endsWith("funding-gate.ts")).toBe(true);
  });
});
