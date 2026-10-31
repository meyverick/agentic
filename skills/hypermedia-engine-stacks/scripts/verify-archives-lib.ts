/**
 * Shared rules and parsers for verify-archives.ts. Zero dependencies.
 *
 * The main script owns the workspace walk and the failure report; this module
 * owns the reusable claims: frontmatter parsing, the migration-table
 * exemption, the retired-token sweep, the unpinned sweep, and the transport
 * table parser. Keeping them here keeps both files under the 300-line
 * cohesive-module band without changing the command of record.
 */
import { readFileSync } from "node:fs";

export const SKILL_CEILING = 250;
export const ARCHIVE_CEILING = 300;
export const DESCRIPTION_CAP = 1024;
export const PILLARS = ["rama", "datastar", "maud", "sqlx", "bevy"];
// The description is the routing surface: a missing pillar or a missing negative
// boundary sends the task to the wrong skill, so it is asserted, not just sized.
export const DESCRIPTION_TERMS = ["Rama", "SQLx", "Maud", "Datastar", "Bevy", "rama-ws", "SvelteKit", "Axum"];
export const LOCK_PATH = "scripts/provenance.lock";
export const COMMIT_SHAPE = /^[0-9a-f]{7,40}$/;
export const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const UNPINNED = [
  [/^Source:/, "an archive names a `Source:` header; the pin belongs in scripts/provenance.lock"],
  [/sha256:/, "the corpus digest belongs in scripts/provenance.lock"],
  [/`[A-Za-z0-9._-]+@[0-9a-f]{7,40}`/, "a `repo@sha` pin belongs in scripts/provenance.lock"],
  [/\b[vV]?\d+\.\d+(?:\.\d+)?\b/, "a release version number belongs in scripts/provenance.lock"],
] as const;
const RETIRED = [
  [".into_sse_event(", "use try_into_sse_event()", null],
  ["data-on-click", "use data-on:click", null],
  ["sqlx-data.json", "the .sqlx/ directory is the offline metadata", null],
  ["ElementPatchMode::Morph", "use ElementPatchMode::Outer", null],
  ["SceneRoot", "use WorldAssetRoot", /\bSceneRoot\b/],
  ["getrandom_backend", "use the wasm_js crate feature of the pinned getrandom", null],
  ["idle_for()", "read the meta.idle_for field", null],
  ["datastar-retries-failed", "guard detail.type on the data-on:datastar-fetch event", null],
  [".only_if_missing(", "use with_only_if_missing() or set_only_if_missing()", null],
  ["EventReader", "use MessageReader with #[derive(Message)]", /\bEventReader\b/],
  ["EventWriter", "use MessageWriter with #[derive(Message)]", /\bEventWriter\b/],
] as const;

export const read = (path: string): string => readFileSync(path, "utf8");
// wc -l parity: every authored file ends with a newline.
export const wcLines = (text: string) => text.split("\n").length - 1;

/** The YAML block between the opening and closing `---` fence. */
export function frontmatter(text: string): string | undefined {
  return /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
}

/** One top-level frontmatter field, folding a wrapped value onto a single line. */
export function frontmatterField(block: string | undefined, field: string): string | undefined {
  if (!block) return undefined;
  const lines = block.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`${field}:`));
  if (start < 0) return undefined;
  const value = [lines[start].slice(field.length + 1).trim()];
  for (const line of lines.slice(start + 1)) {
    if (/^[A-Za-z0-9_-]+:/.test(line)) break;
    value.push(line.trim());
  }
  return value.join(" ").trim();
}

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

export function sweepRetired(path: string, text: string): string[] {
  const findings: string[] = [];
  const lines = text.split("\n");
  const exempt = migrationLines(lines);
  lines.forEach((line, index) => {
    if (exempt[index]) return;
    for (const [token, replacement, boundary] of RETIRED) {
      const hit = boundary ? boundary.test(line) : line.includes(token);
      if (hit) findings.push(`${path}:${index + 1}: retired: names '${token}' outside a migration table; ${replacement}`);
    }
  });
  return findings;
}

/** Lines inside a fenced block, delimiters included. */
function fencedLines(lines: string[]): boolean[] {
  const exempt = new Array<boolean>(lines.length).fill(false);
  let inFence = false;
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      exempt[index] = true;
      inFence = !inFence;
      return;
    }
    exempt[index] = inFence;
  });
  return exempt;
}

/** Nothing outside a fence may claim a release version, a commit pin, or the digest. */
export function sweepUnpinned(path: string, text: string): string[] {
  const findings: string[] = [];
  const lines = text.split("\n");
  const exempt = fencedLines(lines);
  lines.forEach((line, index) => {
    if (exempt[index]) return;
    // `HTTP/1.1` is a protocol name, not a release claim.
    const probe = line.replace(/HTTP\/\d+(?:\.\d+)?/g, "HTTP/x");
    for (const [pattern, detail] of UNPINNED) {
      const token = pattern.exec(probe)?.[0];
      if (token === undefined) continue;
      findings.push(`${path}:${index + 1}: unpinned: names '${token}' outside a fenced block; ${detail}`);
      return;
    }
  });
  return findings;
}

export interface TransportRow {
  key: string;
  answer: string;
  consequence: string;
}

/** Rows of the `State | Answer | Datastar consequence` table, keyed positionally. */
export function transportRows(text: string): TransportRow[] {
  const lines = text.split(/\r?\n/);
  const head = lines.findIndex((line) => /^\|\s*State\s*\|\s*Answer\s*\|\s*Datastar consequence\s*\|$/.test(line));
  if (head < 0) return [];
  const rows: TransportRow[] = [];
  for (const line of lines.slice(head + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length >= 3) rows.push({ key: cells[0], answer: cells[1], consequence: cells[2] });
  }
  return rows;
}
