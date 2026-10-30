/** Parses staged learnings and scores them against the rulebook and the skill catalog. */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import type { Skill } from "./catalog.ts";
import { normalizeRule, tokenize } from "./catalog.ts";

export const NO_OP_OVERLAP_THRESHOLD = 0.72;
export const AFFINITY_UPGRADE_THRESHOLD = 0.28;
const SPLIT_WARNING_THRESHOLD = 450;

export interface Learning {
  file: string;
  domain: string;
  date: string;
  title: string;
  situation: string;
  applied_solution: string;
  prevention_rule: string;
  fingerprint: string;
  fingerprint_full: string;
  rule_tokens: Set<string>;
  all_tokens: Set<string>;
  norm_rule: string;
}

function extractField(block: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*[A-Za-z &]+:\\*\\*|$)`);
  const match = pattern.exec(block);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

export async function parseLearningsDir(learningsDir: string): Promise<Learning[]> {
  const entries: Learning[] = [];
  const isDir = await stat(learningsDir).then((info) => info.isDirectory()).catch(() => false);
  if (!isDir) return entries;

  const heading = /^##\s+(\d{4}-\d{2}-\d{2})\s+(?:--|[\u2013\u2014-])\s+(.+)$/gm;
  const files = (await readdir(learningsDir))
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const content = await readFile(join(learningsDir, file), "utf8");
    const matches = [...content.matchAll(heading)];
    matches.forEach((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index ?? content.length : content.length;
      const block = content.slice(start, end).trim();
      const date = match[1].trim();
      const title = match[2].trim();
      const situation = extractField(block, "Situation & Blocker");
      const solution = extractField(block, "Applied Solution");
      const prevention = extractField(block, "Prevention Rule");
      const normRule = normalizeRule(prevention || title);
      const sha = createHash("sha256").update(normRule, "utf8").digest("hex");
      const domain = file.replace(/\.md$/, "");

      entries.push({
        file,
        domain,
        date,
        title,
        situation,
        applied_solution: solution,
        prevention_rule: prevention.replace(/\u2192/g, "->"),
        fingerprint: sha.slice(0, 8),
        fingerprint_full: sha,
        rule_tokens: tokenize(prevention),
        all_tokens: tokenize(`${domain} ${title} ${situation} ${solution} ${prevention}`),
        norm_rule: normRule,
      });
    });
  }

  return entries;
}

export interface Candidate {
  skill_name: string;
  skill_path: string;
  line_count: number;
  affinity_score: number;
  rule_overlap: number;
}

export interface Evaluated extends Omit<Learning, "rule_tokens" | "all_tokens" | "norm_rule"> {
  agents_md_rule_overlap: number;
  already_integrated_in: string | null;
  suggested_action: string;
  target_hint: string;
  top_skill_candidates: Candidate[];
}

function shared(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const token of left) if (right.has(token)) count += 1;
  return count;
}

/** Presence of `left` tokens inside `right`, normalised by the stated denominator. */
function ratio(left: Set<string>, right: Set<string>, denominator: number): number {
  return denominator === 0 ? 0 : shared(left, right) / denominator;
}

/** Python's f"{v:.0%}" rounds half to even; Math.round does not, so this is explicit. */
export function percent(value: number): string {
  const scaled = value * 100;
  const floor = Math.floor(scaled);
  const fraction = scaled - floor;
  if (fraction > 0.5) return `${floor + 1}%`;
  if (fraction < 0.5) return `${floor}%`;
  return `${floor % 2 === 0 ? floor : floor + 1}%`;
}
const round3 = (value: number): number => Math.round(value * 1000) / 1000;

export async function evaluateLearnings(learnings: Learning[], skills: Skill[], agentsMdPath: string): Promise<Evaluated[]> {
  let agentsText = "";
  let agentsTokens = new Set<string>();
  try {
    agentsText = (await readFile(agentsMdPath, "utf8")).toLowerCase().replace(/\u2192/g, "->");
    agentsTokens = tokenize(agentsText);
  } catch {
    agentsText = "";
  }

  const results: Evaluated[] = [];
  for (const item of learnings) {
    const agentsOverlap = ratio(item.rule_tokens, agentsTokens, item.rule_tokens.size);
    let integrated: string | null = null;
    if (item.norm_rule && agentsText.includes(item.norm_rule)) {
      integrated = `${agentsMdPath} (overlap=${percent(agentsOverlap)})`;
    } else if (agentsOverlap >= NO_OP_OVERLAP_THRESHOLD) {
      integrated = `${agentsMdPath} (overlap=${percent(agentsOverlap)})`;
    }

    const matches: Candidate[] = skills.map((skill) => {
      const broad = ratio(item.all_tokens, skill.tokens, item.all_tokens.size);
      const trigger = ratio(item.all_tokens, skill.trigger_tokens, skill.trigger_tokens.size);
      const rule = ratio(item.rule_tokens, skill.tokens, item.rule_tokens.size);
      const domainBonus =
        item.domain && (skill.name.toLowerCase().includes(item.domain) || skill.description.toLowerCase().includes(item.domain))
          ? 0.25
          : 0;
      const affinity = Math.min(1, 0.45 * broad + 0.3 * trigger + 0.25 * rule + domainBonus);
      if ((item.norm_rule && skill.raw_lower.includes(item.norm_rule)) || rule >= NO_OP_OVERLAP_THRESHOLD) {
        integrated = `${skill.path} (rule_overlap=${percent(rule)})`;
      }
      return {
        skill_name: skill.name,
        skill_path: skill.path,
        line_count: skill.line_count,
        affinity_score: round3(affinity),
        rule_overlap: round3(rule),
      };
    });
    matches.sort((a, b) => b.affinity_score - a.affinity_score);
    const top = matches[0];

    let suggested: string;
    let hint: string;
    if (integrated) {
      suggested = "NO-OP (Candidate)";
      hint = integrated;
    } else if (top && top.affinity_score >= AFFINITY_UPGRADE_THRESHOLD) {
      suggested = top.line_count >= SPLIT_WARNING_THRESHOLD ? "SPLIT" : "UPGRADE";
      hint = `${top.skill_name} (${percent(top.affinity_score)} affinity, ${top.line_count} lines)`;
    } else {
      suggested = "ELEVATE or CREATE";
      hint = "Evaluate 4-Gate AGENTS.md Filter vs. new skill in ~/.agents/skills/";
    }

    results.push({
      file: item.file,
      domain: item.domain,
      date: item.date,
      title: item.title,
      situation: item.situation,
      applied_solution: item.applied_solution,
      prevention_rule: item.prevention_rule,
      fingerprint: item.fingerprint,
      fingerprint_full: item.fingerprint_full,
      agents_md_rule_overlap: round3(agentsOverlap),
      already_integrated_in: integrated,
      suggested_action: suggested,
      target_hint: hint,
      top_skill_candidates: matches.slice(0, 3),
    });
  }

  return results;
}
