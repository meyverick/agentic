#!/usr/bin/env bun
/**
 * Fidelity gate for the hypermedia-engine-stacks holocron. Zero dependencies.
 *
 * Rules, each reported as `<file>: <rule>: <detail>`:
 *   ceiling       SKILL.md <= 250 lines and every references/*.md <= 300 lines
 *   description   frontmatter `description` is non-empty, <= 1024 UTF-16 units
 *                 (the cap the host skill loader applies), and names the six
 *                 pillars plus the SvelteKit/Axum negative boundary
 *   link          every `references/<name>.md` named by SKILL.md resolves on disk
 *                 and all five pillar archives are named
 *   lock          scripts/provenance.lock parses, carries schema 1, the five
 *                 pillar repositories with a commit and a verified date each,
 *                 and the corpus digest exactly once; each archive also keeps
 *                 its `Re-verify when:` trigger
 *   unpinned      no `Source:` header, `sha256:` digest, `repo@sha` pin, or
 *                 release version number outside a fenced code block
 *   retired       no `.into_sse_event(`, `data-on-click`, `sqlx-data.json`,
 *                 `ElementPatchMode::Morph`, `SceneRoot`, `getrandom_backend`,
 *                 `idle_for()`, `datastar-retries-failed`, `.only_if_missing(`,
 *                 `EventReader`, or `EventWriter` outside a migration table
 *   parity        the transport table in SKILL.md and references/rama.md carry
 *                 the same status keys and the same answer/consequence cells
 *   order         every archive carries its sections in the declared order, its
 *                 retired table last, and SKILL.md keeps all eight lifecycle
 *                 steps with an owner archive that resolves on disk
 *
 * Migration-table exemption: a Markdown table whose nearest heading (or whose
 * header row) names "migration", "retired", or "replacement" may name a retired
 * token, because a migration table exists to pair the retired form with its
 * replacement.
 *
 * Fenced-code exemption: a fenced block is an example, not a claim, so a Cargo
 * manifest inside one may carry `version = "0.4"`. Prose and tables may not.
 *
 * Word-boundary sweep: a retired token shaped like an identifier (`SceneRoot`,
 * `EventReader`) matches only as a whole word, so prose that merely contains the
 * substring does not trip the sweep. Punctuation-shaped tokens (`.into_sse_event(`)
 * keep the plain substring match.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  ARCHIVE_CEILING,
  COMMIT_SHAPE,
  DATE_SHAPE,
  DESCRIPTION_CAP,
  DESCRIPTION_TERMS,
  LOCK_PATH,
  PILLARS,
  SKILL_CEILING,
  frontmatter,
  frontmatterField,
  read,
  sweepRetired,
  sweepUnpinned,
  transportRows,
  wcLines,
} from "./verify-archives-lib.ts";

const skillRoot = join(import.meta.dir, "..");
const skillPath = join(skillRoot, "SKILL.md");
const referencesDir = join(skillRoot, "references");

const failures: string[] = [];
const fail = (file: string, rule: string, detail: string) => failures.push(`${file}: ${rule}: ${detail}`);



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

const description = frontmatterField(frontmatter(skill), "description");
if (description === undefined) {
  fail("SKILL.md", "description", "frontmatter carries no `description` field");
} else if (description.length === 0) {
  fail("SKILL.md", "description", "`description` is empty");
} else if (description.length > DESCRIPTION_CAP) {
  fail("SKILL.md", "description", `\`description\` is ${description.length} units > ${DESCRIPTION_CAP}`);
}
if (description !== undefined) {
  for (const term of DESCRIPTION_TERMS) {
    if (!description.includes(term)) {
      fail("SKILL.md", "description", `does not name '${term}'`);
    }
  }
}

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
  if (!head.some((line) => /^Re-verify when: /.test(line))) {
    fail(path, "lock", "does not open with a `Re-verify when:` trigger");
  }

  failures.push(...sweepRetired(path, text));
  failures.push(...sweepUnpinned(path, text));
}

failures.push(...sweepRetired("SKILL.md", skill));
failures.push(...sweepUnpinned("SKILL.md", skill));

// --- provenance lock ------------------------------------------------------------
const covered = new Set(archives.map((name) => name.replace(/\.md$/, "")));
const lockFile = join(skillRoot, LOCK_PATH);

function checkLock(): void {
  if (!existsSync(lockFile)) {
    fail(LOCK_PATH, "lock", "is missing");
    return;
  }
  let lock: Record<string, unknown>;
  try {
    lock = JSON.parse(read(lockFile)) as Record<string, unknown>;
  } catch (error) {
    fail(LOCK_PATH, "lock", `is not valid JSON: ${(error as Error).message}`);
    return;
  }

  if (lock.schema !== 1) fail(LOCK_PATH, "lock", `schema is ${JSON.stringify(lock.schema)}, expected 1`);

  const digests = (JSON.stringify(lock).match(/sha256:[0-9a-f]{64}/g) ?? []).length;
  if (digests !== 1) fail(LOCK_PATH, "lock", `carries ${digests} corpus digests, expected exactly 1`);

  const sources = (lock.sources ?? {}) as Record<string, Record<string, unknown>>;
  const keys = Object.keys(sources).sort();
  const expected = [...PILLARS].sort();
  if (keys.join(",") !== expected.join(",")) {
    fail(LOCK_PATH, "lock", `names '${keys.join(",")}', expected '${expected.join(",")}'`);
  }

  for (const key of keys) {
    const entry = sources[key] ?? {};
    if (typeof entry.repo !== "string" || !/^https?:\/\//.test(entry.repo)) {
      fail(LOCK_PATH, "lock", `entry '${key}' has no repository URL`);
    }
    if (typeof entry.commit !== "string" || !COMMIT_SHAPE.test(entry.commit)) {
      fail(LOCK_PATH, "lock", `entry '${key}' has no commit sha`);
    }
    if (typeof entry.verified !== "string" || !DATE_SHAPE.test(entry.verified)) {
      fail(LOCK_PATH, "lock", `entry '${key}' has no verified date`);
    }
    if (!covered.has(key)) fail(LOCK_PATH, "lock", `names '${key}', which no archive covers`);
  }
}

checkLock();

// --- cross-document parity -----------------------------------------------------
const GATEWAY = "references/rama.md";
const syllabusRows = transportRows(skill);
const gatewayRows = transportRows(read(join(referencesDir, "rama.md")));

if (syllabusRows.length === 0) fail("SKILL.md", "parity", "carries no `| State | Answer | Datastar consequence |` table");
if (gatewayRows.length === 0) fail(GATEWAY, "parity", "carries no `| State | Answer | Datastar consequence |` table");

const gatewayByKey = new Map(gatewayRows.map((row) => [row.key, row]));
const syllabusKeys = new Set(syllabusRows.map((row) => row.key));

for (const row of syllabusRows) {
  const peer = gatewayByKey.get(row.key);
  if (!peer) {
    fail("SKILL.md", "parity", `transport row '${row.key}' has no counterpart in ${GATEWAY}`);
    continue;
  }
  if (peer.answer !== row.answer) fail("SKILL.md", "parity", `transport row '${row.key}' answer differs from ${GATEWAY}`);
  if (peer.consequence !== row.consequence) {
    fail("SKILL.md", "parity", `transport row '${row.key}' consequence differs from ${GATEWAY}`);
  }
}
for (const row of gatewayRows) {
  if (!syllabusKeys.has(row.key)) fail(GATEWAY, "parity", `transport row '${row.key}' is missing from SKILL.md`);
}

// --- section order -------------------------------------------------------------
const RETIRED_HEADING = /^## .*(?:retired|retir|replacement)/i;

/** Anchor sequence per archive, provenance excluded (asserted above): contract, tables, telemetry, retired last. */
const SECTION_ORDER = {
  "rama.md": ["## Service, Layer, Router", "## SSE", "## Transport Status", "## Limits and Admission", "## CSRF", "## WebSockets (WSS)", "## Graceful Drain", "## Telemetry", "## Retired and Replacement"],
  "sqlx.md": ["## Compile-Time Verification", "## Pools and Connections", "## Migrations", "## LISTEN/NOTIFY Fan-Out", "## Telemetry"],
  "datastar.md": ["## Actions and Hypermedia CQRS", "## Morphing", "## Streaming Contract", "## Migration and Retired Forms"],
  "maud.md": ["## The Single Buffer", "## Escaping", "## Component Shape"],
  "bevy.md": ["## Schedule and Data Model", "## Message versus Event", "## WASM and Assets", "## Shell Bridge", "## Migration and Retired Forms"],
} satisfies Record<string, string[]>;

for (const [name, anchors] of Object.entries(SECTION_ORDER)) {
  const path = `references/${name}`;
  if (!existsSync(join(referencesDir, name))) {
    fail(path, "order", "does not exist, so its sections cannot be checked");
    continue;
  }
  const lines = read(join(referencesDir, name)).split(/\r?\n/);
  let previous = -1;
  let previousAnchor = "";
  for (const anchor of anchors) {
    const at = lines.findIndex((line) => line.startsWith(anchor));
    if (at < 0) {
      fail(path, "order", `is missing section '${anchor}'`);
      break;
    }
    if (at < previous) {
      fail(path, "order", `section '${anchor}' appears at line ${at + 1}, before '${previousAnchor}' at line ${previous + 1}`);
      break;
    }
    previous = at;
    previousAnchor = anchor;
  }

  const headings = lines.filter((line) => line.startsWith("## "));
  const last = headings.at(-1);
  const retired = headings.find((line) => RETIRED_HEADING.test(line));
  if (retired && last !== retired) {
    fail(path, "order", `retired table '${retired}' is not the final section; '${last}' follows it`);
  }
}

// --- lifecycle spine -----------------------------------------------------------
const spine = /^## Stream Lifecycle\r?\n([\s\S]*?)(?=^## )/m.exec(skill)?.[1];
if (!spine) {
  fail("SKILL.md", "spine", "has no `## Stream Lifecycle` section");
} else {
  const steps = spine.split("\n").filter((line) => /^\|\s*\d+\s*\|/.test(line));
  if (steps.length !== 8) fail("SKILL.md", "spine", `lists ${steps.length} lifecycle steps, expected 8`);
  for (const step of steps) {
    const [, , rawLabel] = step.split("|");
    const label = rawLabel?.trim() ?? step;
    const owners = [...step.matchAll(/references\/([a-z0-9-]+)\.md/g)].map((match) => match[1]);
    if (owners.length === 0) fail("SKILL.md", "spine", `step '${label}' names no owner archive`);
    for (const owner of owners) {
      if (!existsSync(join(referencesDir, `${owner}.md`))) {
        fail("SKILL.md", "spine", `step '${label}' names references/${owner}.md, which does not exist`);
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`  X ${failure}`);
  console.error(`FAIL: verify-archives (${failures.length} finding${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log(`OK: verify-archives (SKILL.md ${skillLines} lines, ${archives.length} archives)`);
