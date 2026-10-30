#!/usr/bin/env bun
/** Deterministic catalog and learning parser for the learning-curator skill. Read-only. */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import type { Skill } from "./catalog.ts";
import { scanSkillsCatalog, verifySkillsGate } from "./catalog.ts";
import type { Evaluated } from "./learnings.ts";
import { evaluateLearnings, parseLearningsDir, percent } from "./learnings.ts";

const USAGE = `usage: audit-catalog.ts [--learnings-dir <path>] [--skills-dir <path>] [--agents-md <path>]
                          [--format markdown|json] [--verify-skills]`;

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function expand(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return resolve(path);
}

export function renderMarkdownReport(
  skillsDir: string,
  learningsDir: string,
  agentsMdPath: string,
  skills: Skill[],
  evaluated: Evaluated[],
): string {
  const out: string[] = [];
  out.push("# Learning Curator — Deterministic Catalog Audit Report");
  out.push("");
  out.push(`* **Global Skills Root**: \`${skillsDir}\` (\`${skills.length}\` skills discovered)`);
  out.push(`* **Learnings Staging Dir**: \`${learningsDir}\` (\`${evaluated.length}\` entries parsed)`);
  out.push(`* **Rulebook Path**: \`${agentsMdPath}\` (\`${existsSync(agentsMdPath) ? "Present" : "Missing"}\`)`);
  out.push("");

  out.push("## 1. Global Skill Catalog Inventory (`~/.agents/skills/`)");
  out.push("");
  if (skills.length === 0) {
    out.push("_No global skills found in `~/.agents/skills/`._");
  } else {
    out.push("| Skill Name | Physical Lines (`wc -l`) | Status | References | Scripts | Frontmatter Description |");
    out.push("| :--- | :--- | :--- | :--- | :--- | :--- |");
    for (const skill of skills) {
      const description = skill.description.length > 110 ? `${skill.description.slice(0, 107)}...` : skill.description;
      out.push(
        `| \`${skill.name}\` | \`${skill.line_count}\` | \`${skill.status}\` | \`${skill.references.length}\` files | \`${skill.scripts.length}\` files | ${description} |`,
      );
    }
  }
  out.push("");

  out.push("## 2. Staged Learnings Intake & Pre-Triage Matrix (`~/.agents/learnings/*.md`)");
  out.push("");
  if (evaluated.length === 0) {
    out.push("_No learning entries found in `~/.agents/learnings/*.md`._");
  } else {
    out.push("| Source File | Date | Entry Title | Fingerprint | Automated Pre-Triage | Target / Affinity Hint |");
    out.push("| :--- | :--- | :--- | :--- | :--- | :--- |");
    for (const item of evaluated) {
      out.push(
        `| \`${item.file}\` | \`${item.date}\` | ${item.title} | \`${item.fingerprint}\` | \`${item.suggested_action}\` | ${item.target_hint} |`,
      );
    }
    const unique = new Set(evaluated.map((item) => item.fingerprint_full)).size;
    if (unique < evaluated.length) {
      out.push("");
      out.push(`> \`${evaluated.length}\` entries collapse to \`${unique}\` unique prevention rules; repeats are marked in the detail below.`);
    }
    out.push("");
    out.push("### Detailed Prevention Rules Extracted");
    out.push("");
    for (const item of evaluated) {
      out.push(`* **\`[${item.fingerprint}]\` \`${item.file}\` (${item.date}) — ${item.title}**`);
      out.push(`  * *Prevention Rule*: \`${item.prevention_rule}\``);
      if (item.duplicate_of !== null) out.push(`  * *Duplicate Of*: ${item.duplicate_of}`);
      out.push(`  * *AGENTS.md Token Overlap*: \`${percent(item.agents_md_rule_overlap)}\``);
      if (item.top_skill_candidates.length > 0) {
        const candidates = item.top_skill_candidates
          .map((candidate) => `\`${candidate.skill_name}\` (${percent(candidate.affinity_score)})`)
          .join(", ");
        out.push(`  * *Top Global Skill Matches*: ${candidates}`);
      }
    }
  }

  return out.join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const format = flagValue(argv, "--format") ?? "markdown";
  if (!["markdown", "json"].includes(format)) {
    console.error(`error: argument --format: invalid choice: '${format}' (choose from 'markdown', 'json')`);
    console.error(USAGE);
    return 2;
  }

  const learningsDir = expand(flagValue(argv, "--learnings-dir") ?? "~/.agents/learnings");
  const skillsDir = expand(flagValue(argv, "--skills-dir") ?? "~/.agents/skills");
  const agentsMd = expand(flagValue(argv, "--agents-md") ?? "./AGENTS.md");

  const skills = await scanSkillsCatalog(skillsDir);
  const learnings = await parseLearningsDir(learningsDir);
  const evaluated = await evaluateLearnings(learnings, skills, agentsMd);

  if (argv.includes("--verify-skills")) {
    const { passed, violations } = verifySkillsGate(skills);
    if (!passed) {
      for (const violation of violations) console.error(violation);
      return 1;
    }
  }

  if (format === "json") {
    const cleanSkills = skills.map(({ tokens, trigger_tokens, raw_lower, ...rest }) => rest);
    console.log(
      JSON.stringify(
        {
          skills_dir: skillsDir,
          learnings_dir: learningsDir,
          agents_md: agentsMd,
          skills_count: cleanSkills.length,
          learnings_count: evaluated.length,
          skills: cleanSkills,
          learnings: evaluated,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(renderMarkdownReport(skillsDir, learningsDir, agentsMd, skills, evaluated));
  }

  return 0;
}

const meta = import.meta as ImportMeta & { main?: boolean };
if (meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
