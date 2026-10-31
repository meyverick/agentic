import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Wiring test: the package gate fails when the skill verifier fails, and the verifier's own message survives. */
const modules = join(import.meta.dir, "..");
const skill = join(modules, "skills", "hypermedia-engine-stacks");
let roots: string[] = [];

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

function copy(): string {
  const root = mkdtempSync(join(tmpdir(), "verify-archives-"));
  roots.push(root);
  const target = join(root, "skill");
  cpSync(skill, target, { recursive: true });
  return target;
}

function copyModules(): string {
  const root = mkdtempSync(join(tmpdir(), "gate-verifier-"));
  roots.push(root);
  const target = join(root, "modules");
  cpSync(modules, target, { recursive: true, filter: (path) => !path.includes("node_modules") });
  return target;
}

function run(target: string): { status: number; output: string } {
  const result = spawnSync("bun", [join(target, "scripts", "verify-archives.ts")], { encoding: "utf8" });
  return { status: result.status ?? 1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

describe("verify-archives", () => {
  test("the shipped tree passes", () => {
    const result = run(copy());
    expect(result.output).toContain("OK: verify-archives");
    expect(result.status).toBe(0);
  });

  test("a commit pin fails and names the file and rule", () => {
    const target = copy();
    appendFileSync(join(target, "references", "rama.md"), "\nSource: `rama@2fbd04041`\n");
    const result = run(target);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("references/rama.md");
    expect(result.output).toContain("unpinned");
  });

  test("a lock missing a pillar fails and names the mismatch", () => {
    const target = copy();
    const path = join(target, "scripts", "provenance.lock");
    const lock = JSON.parse(readFileSync(path, "utf8")) as { sources: Record<string, unknown> };
    delete lock.sources.bevy;
    writeFileSync(path, JSON.stringify(lock, null, 2));
    const result = run(target);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("scripts/provenance.lock: lock:");
    expect(result.output).toContain("bevy");
  });

  test("a duplicated transport row fails parity", () => {
    const target = copy();
    const path = join(target, "SKILL.md");
    const text = readFileSync(path, "utf8");
    const changed = text.replace(/\| Command accepted \|[^\n]*/, "| Command accepted | `204 No Content` | changed consequence |");
    expect(changed).not.toBe(text);
    writeFileSync(path, changed);
    const result = run(target);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("parity");
  });

  test("a description over the cap fails", () => {
    const target = copy();
    const path = join(target, "SKILL.md");
    const text = readFileSync(path, "utf8");
    const changed = text.replace(/^description: .*$/m, `description: ${"x".repeat(1025)}`);
    expect(changed).not.toBe(text);
    writeFileSync(path, changed);
    const result = run(target);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("description");
  });

  test("the package gate fails when the verifier fails", () => {
    const target = copyModules();
    appendFileSync(join(target, "skills", "hypermedia-engine-stacks", "references", "rama.md"), "\nSource: `rama@2fbd04041`\n");
    const result = spawnSync("bun", ["scripts/gates.ts"], { cwd: target, encoding: "utf8" });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(result.status).not.toBe(0);
    expect(output).toContain("skill fidelity verifier failed");
    expect(output).toContain("unpinned");
    expect(output).toContain("rama.md");
  });
});
