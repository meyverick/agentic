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
