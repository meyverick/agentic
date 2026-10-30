#!/usr/bin/env python3
"""
Deterministic Learning & Global Skill Catalog Auditor for `learning-curator`.

Performs strictly read-only inspection across:
  1. `./learnings/*.md` (parses empirical learning blocks + SHA-256 fingerprints)
  2. `~/.agents/skills/` (audits SKILL.md frontmatter, physical line counts, and auxiliary assets)
  3. `./AGENTS.md` (checks invariant coverage and token overlap)

Uses Python 3 standard library only. Never modifies, creates, or deletes any files.
"""

import argparse
import hashlib
import json
import pathlib
import re
import sys
from typing import Dict, List, Optional, Set, Tuple

LINE_CEILING = 500
SPLIT_WARNING_THRESHOLD = 450
NO_OP_OVERLAP_THRESHOLD = 0.72
AFFINITY_UPGRADE_THRESHOLD = 0.28

STOPWORDS: Set[str] = {
    "a", "an", "and", "are", "as", "at", "be", "because", "before", "by",
    "can", "cannot", "do", "does", "for", "from", "had", "has", "have",
    "if", "in", "into", "is", "it", "its", "may", "must", "never", "no",
    "not", "of", "on", "Only", "only", "or", "other", "otherwise", "our",
    "should", "so", "some", "such", "than", "that", "the", "their", "them",
    "then", "there", "therefore", "these", "they", "this", "those", "through",
    "to", "under", "unless", "until", "up", "use", "used", "using", "via",
    "was", "we", "were", "what", "when", "where", "which", "while", "who",
    "with", "without", "would",
}


def tokenize(text: str) -> Set[str]:
    """Extract normalized alphanumeric/identifier tokens excluding stopwords."""
    cleaned = text.lower().replace("\u2192", " ").replace("->", " ")
    raw_tokens = re.findall(r"[a-z0-9_./-]+", cleaned)
    tokens: Set[str] = set()
    for tok in raw_tokens:
        stripped = tok.strip("._/-")
        if len(stripped) >= 3 and stripped not in STOPWORDS:
            tokens.add(stripped)
    return tokens


def normalize_rule(rule_text: str) -> str:
    """Normalize a Prevention Rule string for deterministic SHA-256 fingerprinting."""
    normalized = rule_text.replace("\u2192", "->")
    normalized = re.sub(r"\s+", " ", normalized).strip().lower()
    return normalized


def parse_frontmatter(content: str) -> Tuple[Optional[str], Optional[str], bool]:
    """Parse YAML frontmatter `name` and `description` from SKILL.md."""
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, None, False

    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break

    if end_idx is None:
        return None, None, False

    fm_lines = lines[1:end_idx]
    name_val: Optional[str] = None
    desc_lines: List[str] = []
    collecting_desc = False

    for line in fm_lines:
        name_match = re.match(r"^name:\s*(.+)$", line)
        if name_match:
            collecting_desc = False
            name_val = name_match.group(1).strip().strip("'\"")
            continue

        desc_match = re.match(r"^description:\s*(.*)$", line)
        if desc_match:
            collecting_desc = True
            first_part = desc_match.group(1).strip()
            if first_part and first_part not in ("|", ">", "|-", ">-"):
                desc_lines.append(first_part.strip("'\""))
            continue

        if collecting_desc:
            if re.match(r"^[a-zA-Z0-9_-]+:\s*", line):
                collecting_desc = False
            else:
                desc_lines.append(line.strip())

    desc_val = " ".join(desc_lines).strip() if desc_lines else None
    is_valid = bool(name_val and desc_val)
    return name_val, desc_val, is_valid


def scan_skills_catalog(skills_dir: pathlib.Path) -> List[Dict]:
    """Inventory all skills inside `~/.agents/skills/`."""
    catalog: List[Dict] = []
    if not skills_dir.exists() or not skills_dir.is_dir():
        return catalog

    for entry in sorted(skills_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue

        skill_md = entry / "SKILL.md"
        if not skill_md.exists():
            continue

        raw_text = skill_md.read_text(encoding="utf-8", errors="replace")
        physical_lines = len(raw_text.splitlines())
        name, description, valid_fm = parse_frontmatter(raw_text)

        refs_dir = entry / "references"
        scripts_dir = entry / "scripts"
        ref_files = (
            sorted(str(p.relative_to(entry)) for p in refs_dir.rglob("*") if p.is_file())
            if refs_dir.exists()
            else []
        )
        script_files = (
            sorted(str(p.relative_to(entry)) for p in scripts_dir.rglob("*") if p.is_file())
            if scripts_dir.exists()
            else []
        )

        combined_corpus = raw_text
        if refs_dir.exists():
            for ref_path in refs_dir.rglob("*.md"):
                if ref_path.is_file():
                    combined_corpus += "\n" + ref_path.read_text(encoding="utf-8", errors="replace")

        status = "OK"
        if physical_lines >= LINE_CEILING:
            status = "OVER_CEILING (>=500 lines)"
        elif physical_lines >= SPLIT_WARNING_THRESHOLD:
            status = "SPLIT_CANDIDATE (>=450 lines)"

        if not valid_fm:
            status = f"{status} | INVALID_FRONTMATTER"

        catalog.append(
            {
                "dir_name": entry.name,
                "name": name or entry.name,
                "path": str(skill_md),
                "description": description or "",
                "line_count": physical_lines,
                "valid_frontmatter": valid_fm,
                "status": status,
                "references": ref_files,
                "scripts": script_files,
                "_tokens": tokenize(combined_corpus),
                "_trigger_tokens": tokenize((name or "") + " " + (description or "")),
                "_raw_lower": combined_corpus.lower().replace("\u2192", "->"),
            }
        )

    return catalog


def parse_learnings_dir(learnings_dir: pathlib.Path) -> List[Dict]:
    """Parse all `## YYYY-MM-DD — <Title>` entries from `./learnings/*.md`."""
    entries: List[Dict] = []
    if not learnings_dir.exists() or not learnings_dir.is_dir():
        return entries

    heading_pattern = re.compile(
        r"^##\s+(\d{4}-\d{2}-\d{2})\s+(?:--|[\u2013\u2014-])\s+(.+)$",
        re.MULTILINE,
    )

    for md_file in sorted(learnings_dir.glob("*.md")):
        if not md_file.is_file():
            continue

        content = md_file.read_text(encoding="utf-8", errors="replace")
        matches = list(heading_pattern.finditer(content))

        for idx, match in enumerate(matches):
            date_str = match.group(1).strip()
            title_str = match.group(2).strip()
            start_pos = match.end()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(content)
            block = content[start_pos:end_pos].strip()

            situation = _extract_field(block, "Situation & Blocker")
            solution = _extract_field(block, "Applied Solution")
            prevention = _extract_field(block, "Prevention Rule")

            norm_rule = normalize_rule(prevention or title_str)
            rule_sha = hashlib.sha256(norm_rule.encode("utf-8")).hexdigest()

            entries.append(
                {
                    "file": md_file.name,
                    "domain": md_file.stem,
                    "date": date_str,
                    "title": title_str,
                    "situation": situation,
                    "applied_solution": solution,
                    "prevention_rule": prevention.replace("\u2192", "->"),
                    "fingerprint": rule_sha[:8],
                    "fingerprint_full": rule_sha,
                    "_rule_tokens": tokenize(prevention),
                    "_all_tokens": tokenize(f"{md_file.stem} {title_str} {situation} {solution} {prevention}"),
                    "_norm_rule": norm_rule,
                }
            )

    return entries


def _extract_field(block: str, field_name: str) -> str:
    """Extract markdown bold field value `**Field:** ...` from a learning section."""
    pattern = re.compile(
        rf"\*\*{re.escape(field_name)}:\*\*\s*(.*?)(?=\n\s*\*\*[A-Za-z &]+:\*\*|\Z)",
        re.DOTALL,
    )
    match = pattern.search(block)
    if not match:
        return ""
    return re.sub(r"\s+", " ", match.group(1)).strip()


def evaluate_learnings(
    learnings: List[Dict],
    skills: List[Dict],
    agents_md_path: pathlib.Path,
) -> List[Dict]:
    """Compute deduplication status and skill affinity rankings for each learning."""
    agents_text = ""
    agents_tokens: Set[str] = set()
    if agents_md_path.exists() and agents_md_path.is_file():
        agents_text = (
            agents_md_path.read_text(encoding="utf-8", errors="replace")
            .lower()
            .replace("\u2192", "->")
        )
        agents_tokens = tokenize(agents_text)

    results: List[Dict] = []

    for item in learnings:
        rule_tokens = item["_rule_tokens"]
        all_tokens = item["_all_tokens"]
        norm_rule = item["_norm_rule"]

        # 1. Check AGENTS.md integration
        agents_rule_overlap = (
            len(rule_tokens & agents_tokens) / len(rule_tokens)
            if rule_tokens
            else 0.0
        )
        in_agents_exact = bool(norm_rule and norm_rule in agents_text)

        # 2. Score against each global skill in ~/.agents/skills/
        skill_matches: List[Dict] = []
        already_integrated_in: Optional[str] = None

        if in_agents_exact or agents_rule_overlap >= NO_OP_OVERLAP_THRESHOLD:
            already_integrated_in = f"{agents_md_path} (overlap={agents_rule_overlap:.0%})"

        for sk in skills:
            sk_tokens = sk["_tokens"]
            trig_tokens = sk["_trigger_tokens"]

            rule_overlap = (
                len(rule_tokens & sk_tokens) / len(rule_tokens)
                if rule_tokens
                else 0.0
            )
            broad_overlap = (
                len(all_tokens & sk_tokens) / len(all_tokens)
                if all_tokens
                else 0.0
            )
            trigger_overlap = (
                len(all_tokens & trig_tokens) / len(trig_tokens)
                if trig_tokens
                else 0.0
            )
            domain_bonus = 0.25 if item["domain"] in sk["name"].lower() or item["domain"] in sk["description"].lower() else 0.0

            affinity_score = min(
                1.0,
                (0.45 * broad_overlap) + (0.30 * trigger_overlap) + (0.25 * rule_overlap) + domain_bonus,
            )

            exact_in_skill = bool(norm_rule and norm_rule in sk["_raw_lower"])
            if exact_in_skill or rule_overlap >= NO_OP_OVERLAP_THRESHOLD:
                already_integrated_in = f"{sk['path']} (rule_overlap={rule_overlap:.0%})"

            skill_matches.append(
                {
                    "skill_name": sk["name"],
                    "skill_path": sk["path"],
                    "line_count": sk["line_count"],
                    "affinity_score": round(affinity_score, 3),
                    "rule_overlap": round(rule_overlap, 3),
                }
            )

        skill_matches.sort(key=lambda x: x["affinity_score"], reverse=True)
        top_match = skill_matches[0] if skill_matches else None

        if already_integrated_in:
            suggested_action = "NO-OP (Candidate)"
            target_hint = already_integrated_in
        elif top_match and top_match["affinity_score"] >= AFFINITY_UPGRADE_THRESHOLD:
            if top_match["line_count"] >= SPLIT_WARNING_THRESHOLD:
                suggested_action = "SPLIT"
            else:
                suggested_action = "UPGRADE"
            target_hint = f"{top_match['skill_name']} ({top_match['affinity_score']:.0%} affinity, {top_match['line_count']} lines)"
        else:
            suggested_action = "ELEVATE or CREATE"
            target_hint = "Evaluate 4-Gate AGENTS.md Filter vs. new skill in ~/.agents/skills/"

        clean_item = {
            k: v for k, v in item.items() if not k.startswith("_")
        }
        clean_item["agents_md_rule_overlap"] = round(agents_rule_overlap, 3)
        clean_item["already_integrated_in"] = already_integrated_in
        clean_item["suggested_action"] = suggested_action
        clean_item["target_hint"] = target_hint
        clean_item["top_skill_candidates"] = skill_matches[:3]
        results.append(clean_item)

    return results


def render_markdown_report(
    skills_dir: pathlib.Path,
    learnings_dir: pathlib.Path,
    agents_md_path: pathlib.Path,
    skills: List[Dict],
    evaluated_learnings: List[Dict],
) -> str:
    """Format the audit inventory and triage pre-computation as Markdown."""
    out: List[str] = []
    out.append("# Learning Curator — Deterministic Catalog Audit Report")
    out.append("")
    out.append(f"* **Global Skills Root**: `{skills_dir}` (`{len(skills)}` skills discovered)")
    out.append(f"* **Learnings Staging Dir**: `{learnings_dir}` (`{len(evaluated_learnings)}` entries parsed)")
    out.append(f"* **Rulebook Path**: `{agents_md_path}` (`{'Present' if agents_md_path.exists() else 'Missing'}`)")
    out.append("")

    out.append("## 1. Global Skill Catalog Inventory (`~/.agents/skills/`)")
    out.append("")
    if not skills:
        out.append("_No global skills found in `~/.agents/skills/`._")
    else:
        out.append("| Skill Name | Physical Lines (`wc -l`) | Status | References | Scripts | Frontmatter Description |")
        out.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for sk in skills:
            desc_short = sk["description"]
            if len(desc_short) > 110:
                desc_short = desc_short[:107] + "..."
            refs_cnt = len(sk["references"])
            scripts_cnt = len(sk["scripts"])
            out.append(
                f"| `{sk['name']}` | `{sk['line_count']}` | `{sk['status']}` | `{refs_cnt}` files | `{scripts_cnt}` files | {desc_short} |"
            )
    out.append("")

    out.append("## 2. Staged Learnings Intake & Pre-Triage Matrix (`./learnings/*.md`)")
    out.append("")
    if not evaluated_learnings:
        out.append("_No learning entries found in `./learnings/*.md`._")
    else:
        out.append("| Source File | Date | Entry Title | Fingerprint | Automated Pre-Triage | Target / Affinity Hint |")
        out.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for lr in evaluated_learnings:
            out.append(
                f"| `{lr['file']}` | `{lr['date']}` | {lr['title']} | `{lr['fingerprint']}` | `{lr['suggested_action']}` | {lr['target_hint']} |"
            )
        out.append("")
        out.append("### Detailed Prevention Rules Extracted")
        out.append("")
        for lr in evaluated_learnings:
            out.append(f"* **`[{lr['fingerprint']}]` `{lr['file']}` ({lr['date']}) — {lr['title']}**")
            out.append(f"  * *Prevention Rule*: `{lr['prevention_rule']}`")
            out.append(f"  * *AGENTS.md Token Overlap*: `{lr['agents_md_rule_overlap']:.0%}`")
            if lr["top_skill_candidates"]:
                cands = ", ".join(
                    f"`{c['skill_name']}` ({c['affinity_score']:.0%})"
                    for c in lr["top_skill_candidates"]
                )
                out.append(f"  * *Top Global Skill Matches*: {cands}")

    return "\n".join(out)


def verify_skills_gate(skills: List[Dict]) -> Tuple[bool, List[str]]:
    """Verify all skills in `~/.agents/skills/` obey frontmatter and <500 line invariants."""
    violations: List[str] = []
    for sk in skills:
        if not sk["valid_frontmatter"]:
            violations.append(
                f"[FAIL] {sk['path']}: Missing or invalid YAML frontmatter (`name` and `description` required)."
            )
        if sk["line_count"] >= LINE_CEILING:
            violations.append(
                f"[FAIL] {sk['path']}: Physical line count is {sk['line_count']} (must be strictly < {LINE_CEILING})."
            )
    return len(violations) == 0, violations


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deterministic catalog and learning parser for learning-curator."
    )
    parser.add_argument(
        "--learnings-dir",
        default="./learnings",
        help="Path to the read-only learnings staging directory (default: ./learnings)",
    )
    parser.add_argument(
        "--skills-dir",
        default="~/.agents/skills",
        help="Path to the global skills catalog (default: ~/.agents/skills)",
    )
    parser.add_argument(
        "--agents-md",
        default="./AGENTS.md",
        help="Path to AGENTS.md rulebook (default: ./AGENTS.md)",
    )
    parser.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="Output format (markdown or json)",
    )
    parser.add_argument(
        "--verify-skills",
        action="store_true",
        help="Enforce post-curation verification gate (frontmatter validity and <500 physical lines).",
    )

    args = parser.parse_args()
    learnings_dir = pathlib.Path(args.learnings_dir).expanduser().resolve()
    skills_dir = pathlib.Path(args.skills_dir).expanduser().resolve()
    agents_md_path = pathlib.Path(args.agents_md).expanduser().resolve()

    skills = scan_skills_catalog(skills_dir)
    learnings = parse_learnings_dir(learnings_dir)
    evaluated = evaluate_learnings(learnings, skills, agents_md_path)

    if args.verify_skills:
        passed, violations = verify_skills_gate(skills)
        if not passed:
            for v in violations:
                print(v, file=sys.stderr)
            return 1

    if args.format == "json":
        clean_skills = [
            {k: v for k, v in s.items() if not k.startswith("_")}
            for s in skills
        ]
        payload = {
            "skills_dir": str(skills_dir),
            "learnings_dir": str(learnings_dir),
            "agents_md": str(agents_md_path),
            "skills_count": len(clean_skills),
            "learnings_count": len(evaluated),
            "skills": clean_skills,
            "learnings": evaluated,
        }
        print(json.dumps(payload, indent=2))
    else:
        report = render_markdown_report(
            skills_dir, learnings_dir, agents_md_path, skills, evaluated
        )
        print(report)

    return 0


if __name__ == "__main__":
    sys.exit(main())