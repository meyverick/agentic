#!/usr/bin/env bun
/**
 * Fidelity gate for the hypermedia-engine-stacks holocron. Zero dependencies.
 *
 * Rules, each reported as `<file>: <rule>: <detail>`:
 *   ceiling       SKILL.md <= 250 lines and every references/*.md <= 300 lines
 *   link          every `references/<name>.md` named by SKILL.md resolves on disk
 *                 and all five pillar archives are named
 *   provenance    every archive opens with `Source: <repo>@<sha> · verified <date>`
 *                 plus a `Re-verify when:` trigger
 *   digest        SKILL.md carries the corpus digest exactly once
 *   retired       no `.into_sse_event(`, `data-on-click`, `sqlx-data.json`,
 *                 `ElementPatchMode::Morph`, `SceneRoot`, `getrandom_backend`, or
 *                 `idle_for()` outside a migration table
 *
 * Migration-table exemption: a Markdown table whose nearest heading (or whose
 * header row) names "migration", "retired", or "replacement" may name a retired
 * token, because a migration table exists to pair the retired form with its
 * replacement.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const skillRoot = join(import.meta.dir, "..");
const skillPath = join(skillRoot, "SKILL.md");
const referencesDir = join(skillRoot, "references");

const SKILL_CEILING = 250;
const ARCHIVE_CEILING = 300;
const PILLARS = ["rama", "datastar", "maud", "sqlx", "bevy"];
const RETIRED = [
  [".into_sse_event(", "use try_into_sse_event()"],
  ["data-on-click", "use data-on:click"],
  ["sqlx-data.json", "the .sqlx/ directory is the offline metadata"],
  ["ElementPatchMode::Morph", "use ElementPatchMode::Outer"],
  ["SceneRoot", "use WorldAssetRoot"],
  ["getrandom_backend", "use the getrandom 0.4 wasm_js crate feature"],
  ["idle_for()", "read the meta.idle_for field"],
] as const;

const failures: string[] = [];
const fail = (file: string, rule: string, detail: string) => failures.push(`${file}: ${rule}: ${detail}`);
const read = (path: string) => readFileSync(path, "utf8");
// wc -l parity: every authored file ends with a newline.
const wcLines = (text: string) => text.split("\n").length - 1;

/** Mark lines belonging to a migration/retired/replacement table. */
function migrationLines(lines: string[]): boolean[] {
  const exempt = new Array<boolean>(lines.length).fill(false);
  let heading = "";
  let inFence = false;
  let inTable = false;
  let migration = false;

  lines.forEach((line, index) => {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      inTable = false;
      migration = false;
      return;
    }
    if (inFence) return;

    const headingMatch = /^#{1,6}\s+(.*)$/.exec(line);
    if (headingMatch) {
      heading = headingMatch[1];
      inTable = false;
      migration = false;
      return;
    }

    if (line.startsWith("|")) {
      if (!inTable) {
        inTable = true;
        migration = /migration|retir|replacement/i.test(`${heading} ${line}`);
      }
      exempt[index] = migration;
      return;
    }

    if (line.trim() !== "") {
      inTable = false;
      migration = false;
    }
  });

  return exempt;
}

function sweepRetired(path: string, text: string): void {
  const lines = text.split("\n");
  const exempt = migrationLines(lines);
  lines.forEach((line, index) => {
    if (exempt[index]) return;
    for (const [token, replacement] of RETIRED) {
      const hit = token === "SceneRoot" ? /\bSceneRoot\b/.test(line) : line.includes(token);
      if (hit) fail(`${path}:${index + 1}`, "retired", `names '${token}' outside a migration table; ${replacement}`);
    }
  });
}

// --- syllabus -----------------------------------------------------------------
const skill = read(skillPath);
const skillLines = wcLines(skill);
if (skillLines > SKILL_CEILING) fail("SKILL.md", "ceiling", `${skillLines} lines > ${SKILL_CEILING}`);

const named = new Set<string>();
for (const match of skill.matchAll(/references\/([a-z0-9-]+)\.md/g)) named.add(match[1]);
for (const pillar of PILLARS) {
  if (!named.has(pillar)) fail("SKILL.md", "link", `does not name references/${pillar}.md`);
}
for (const name of named) {
  if (!existsSync(join(referencesDir, `${name}.md`))) {
    fail("SKILL.md", "link", `names references/${name}.md, which does not exist`);
  }
}

const digests = skill.match(/sha256:[0-9a-f]{64}/g) ?? [];
if (digests.length !== 1) fail("SKILL.md", "digest", `carries ${digests.length} corpus digests, expected exactly 1`);

// --- archives -----------------------------------------------------------------
const archives = readdirSync(referencesDir)
  .filter((name) => name.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b));

for (const name of archives) {
  const path = `references/${name}`;
  const text = read(join(referencesDir, name));
  const lines = wcLines(text);
  if (lines > ARCHIVE_CEILING) fail(path, "ceiling", `${lines} lines > ${ARCHIVE_CEILING}`);

  const head = text.split("\n").slice(0, 6).filter((line) => line.trim() !== "");
  const source = head.find((line) => /^Source: /.test(line));
  if (!source) fail(path, "provenance", "does not open with a `Source:` line");
  else if (!/`[A-Za-z0-9._-]+@[0-9a-f]{7,40}`/.test(source) || !/verified \d{4}-\d{2}-\d{2}/.test(source)) {
    fail(path, "provenance", "`Source:` line lacks a repo@sha pin or a verified date");
  }
  if (!head.some((line) => /^Re-verify when: /.test(line))) {
    fail(path, "provenance", "does not open with a `Re-verify when:` trigger");
  }

  sweepRetired(path, text);
}

sweepRetired("SKILL.md", skill);

if (failures.length > 0) {
  for (const failure of failures) console.error(`  X ${failure}`);
  console.error(`FAIL: verify-archives (${failures.length} finding${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log(`OK: verify-archives (SKILL.md ${skillLines} lines, ${archives.length} archives)`);
