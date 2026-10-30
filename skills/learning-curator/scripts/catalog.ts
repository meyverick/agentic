/** Read-only inventory of a skills catalog: frontmatter, size, assets, token corpus. */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export const LINE_CEILING = 500;
export const SPLIT_WARNING_THRESHOLD = 450;

const STOPWORDS = new Set(
  `a an and are as at be because before by can cannot do does for from had has have if in into is it its may must never no not of on only or other otherwise our should so some such than that the their them then there therefore these they this those through to under unless until up use used using via was we were what when where which while who with without would`.split(
    " ",
  ),
);

export function physicalLines(text: string): number {
  if (text.length === 0) return 0;
  const lines = text.split(/\r\n|[\r\n\u000b\u000c\u001c\u001d\u001e\u0085\u2028\u2029]/);
  return lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}

export function tokenize(text: string): Set<string> {
  const cleaned = text.toLowerCase().replace(/\u2192/g, " ").replace(/->/g, " ");
  const tokens = new Set<string>();
  for (const raw of cleaned.match(/[a-z0-9_./-]+/g) ?? []) {
    const stripped = raw.replace(/^[._/-]+|[._/-]+$/g, "");
    if (stripped.length >= 3 && !STOPWORDS.has(stripped)) tokens.add(stripped);
  }
  return tokens;
}

export function normalizeRule(ruleText: string): string {
  return ruleText.replace(/\u2192/g, "->").replace(/\s+/g, " ").trim().toLowerCase();
}

export interface Frontmatter {
  name: string | null;
  description: string | null;
  valid: boolean;
}

export function parseFrontmatter(content: string): Frontmatter {
  const lines = content.split(/\r\n|[\r\n]/);
  if (lines.length === 0 || lines[0].trim() !== "---") return { name: null, description: null, valid: false };
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      end = index;
      break;
    }
  }
  if (end === -1) return { name: null, description: null, valid: false };

  let name: string | null = null;
  const description: string[] = [];
  let collecting = false;
  for (const line of lines.slice(1, end)) {
    const nameMatch = /^name:\s*(.+)$/.exec(line);
    if (nameMatch) {
      collecting = false;
      name = nameMatch[1].trim().replace(/^['"]|['"]$/g, "");
      continue;
    }
    const descMatch = /^description:\s*(.*)$/.exec(line);
    if (descMatch) {
      collecting = true;
      const first = descMatch[1].trim();
      if (first && !["|", ">", "|-", ">-"].includes(first)) description.push(first.replace(/^['"]|['"]$/g, ""));
      continue;
    }
    if (collecting) {
      if (/^[a-zA-Z0-9_-]+:\s*/.test(line)) collecting = false;
      else description.push(line.trim());
    }
  }
  const desc = description.length > 0 ? description.join(" ").trim() : null;
  return { name, description: desc, valid: Boolean(name && desc) };
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function listFiles(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path, base)));
    else files.push(relative(base, path).split(/[\\/]/).join("/"));
  }
  return files.sort();
}

export interface Skill {
  dir_name: string;
  name: string;
  path: string;
  description: string;
  line_count: number;
  valid_frontmatter: boolean;
  status: string;
  references: string[];
  scripts: string[];
  tokens: Set<string>;
  trigger_tokens: Set<string>;
  raw_lower: string;
}

export async function scanSkillsCatalog(skillsDir: string): Promise<Skill[]> {
  const catalog: Skill[] = [];
  if (!(await isDirectory(skillsDir))) return catalog;

  const entries = (await readdir(skillsDir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const dir = join(skillsDir, entry.name);
    const skillMd = join(dir, "SKILL.md");
    const file = await stat(skillMd).catch(() => null);
    if (!file?.isFile()) continue;

    const raw = await readFile(skillMd, "utf8");
    const lineCount = physicalLines(raw);
    const { name, description, valid } = parseFrontmatter(raw);

    const refsDir = join(dir, "references");
    const scriptsDir = join(dir, "scripts");
    const references = (await isDirectory(refsDir)) ? await listFiles(refsDir, dir) : [];
    const scripts = (await isDirectory(scriptsDir)) ? await listFiles(scriptsDir, dir) : [];

    let corpus = raw;
    for (const rel of references) {
      if (rel.endsWith(".md")) corpus += `\n${await readFile(join(dir, rel), "utf8")}`;
    }

    let status = "OK";
    if (lineCount >= LINE_CEILING) status = "OVER_CEILING (>=500 lines)";
    else if (lineCount >= SPLIT_WARNING_THRESHOLD) status = "SPLIT_CANDIDATE (>=450 lines)";
    if (!valid) status = `${status} | INVALID_FRONTMATTER`;

    catalog.push({
      dir_name: entry.name,
      name: name ?? entry.name,
      path: skillMd,
      description: description ?? "",
      line_count: lineCount,
      valid_frontmatter: valid,
      status,
      references,
      scripts,
      tokens: tokenize(corpus),
      trigger_tokens: tokenize(`${name ?? ""} ${description ?? ""}`),
      raw_lower: corpus.toLowerCase().replace(/\u2192/g, "->"),
    });
  }

  return catalog;
}

export function verifySkillsGate(skills: Skill[]): { passed: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const skill of skills) {
    if (!skill.valid_frontmatter) {
      violations.push(`[FAIL] ${skill.path}: Missing or invalid YAML frontmatter (\`name\` and \`description\` required).`);
    }
    if (skill.line_count >= LINE_CEILING) {
      violations.push(`[FAIL] ${skill.path}: Physical line count is ${skill.line_count} (must be strictly < ${LINE_CEILING}).`);
    }
  }
  return { passed: violations.length === 0, violations };
}
