#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const failures: string[] = [];
const git = (...args: string[]): string =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" });

// Gate 1: ownership markers are install-only, never tracked.
const tracked = git("ls-files").split("\n").filter(Boolean);
const markers = tracked.filter((path) => path.split("/").pop() === ".agentic");
if (markers.length > 0) {
  failures.push(`tracked ownership markers (install-only): ${markers.join(", ")}`);
}

// Gate 2: every skill directory has a SKILL.md whose frontmatter name matches the directory.
const skills = (await readdir(join(root, "skills"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of skills) {
  let text: string;
  try {
    text = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");
  } catch {
    failures.push(`skills/${name}: missing SKILL.md`);
    continue;
  }
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
  const declared = frontmatter ? /^name:\s*['"]?([^'"\n]+?)['"]?\s*$/m.exec(frontmatter)?.[1] : undefined;
  if (!declared) failures.push(`skills/${name}: frontmatter has no name`);
  else if (declared.trim() !== name) {
    failures.push(`skills/${name}: frontmatter name '${declared.trim()}' does not match directory`);
  }
}

// Gate 4: the repository has exactly one script runtime.
const foreignScripts = tracked.filter((path) => /\.(py|sh)$/i.test(path));
if (foreignScripts.length > 0) {
  failures.push(`tracked non-TypeScript scripts: ${foreignScripts.join(", ")}`);
}

// Gate 5: skill documentation must not name a removed script or a non-bun interpreter command.
// Quoted upstream material may mention foreign files; only this repository's legacy scripts and
// interpreter-prefixed invocations are treated as offenders.
const LEGACY_SCRIPT = /(funding-gate\.py|test_funding_gate\.py|sync-wiki\.sh|perf_harness\.py|audit_learning_catalog\.py|\bcheck\.sh\b|\bpython3?\s+[^`\n]*\.(py|sh)\b|\bbash\s+[^`\n]*\.sh\b)/;
const skillDocs = tracked.filter((path) => path.startsWith("skills/") && path.endsWith(".md"));
for (const path of skillDocs) {
  const text = await readFile(join(root, path), "utf8");
  text.split(/\r?\n/).forEach((text_line, index) => {
    if (!text_line.includes("`")) return;
    const where = `${path}:${index + 1}`;
    if (LEGACY_SCRIPT.test(text_line)) failures.push(`${where}: names a removed script or a non-bun interpreter`);
    // A bare `./scripts/` mention is prose about the rule; only a concrete script path is an offender.
    if (/`[^`]*(\.[/\\]|skills\/[a-z0-9-]+\/)scripts\/[^`\s]*\.(ts|py|sh)\b/.test(text_line)) {
      failures.push(`${where}: uses a repository-relative script path`);
    }
  });
}

// Gate 3: the packed artifact carries the executable, every skill, and the rulebook.
let packOutput: string;
try {
  packOutput = execFileSync("bun", ["pm", "pack", "--dry-run"], { cwd: root, encoding: "utf8", stdio: "pipe" });
} catch (error) {
  const detail = (error as { stderr?: string }).stderr?.trim() ?? String(error);
  console.error(`  X bun pm pack --dry-run failed: ${detail}`);
  console.error("FAIL: package gate");
  process.exit(1);
}

const packed = packOutput
  .split("\n")
  .map((line) => /^packed\s+\S+\s+(.*)$/.exec(line)?.[1]?.trim())
  .filter((path): path is string => Boolean(path));

if (!packed.some((path) => path.startsWith("src/"))) failures.push("packed artifact is missing src/");
if (!packed.includes("AGENTS.md")) failures.push("packed artifact is missing AGENTS.md");
const packedSkills = new Set(
  packed.filter((path) => path.startsWith("skills/")).map((path) => path.split("/")[1]),
);
if (packedSkills.size === 0) failures.push("packed artifact is missing skills/");
for (const name of skills) {
  if (!packedSkills.has(name)) failures.push(`packed artifact is missing skills/${name}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`  X ${failure}`);
  console.error("FAIL: package gate");
  process.exit(1);
}
console.log(`  ${skills.length} skills validated, ${packed.length} packaged files verified`);
