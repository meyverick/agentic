import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export const UA = { "User-Agent": "funding-gate/1.0 (+https://docs.github.com/sponsors)" };
export const SPONSORS = "https://github.com/sponsors/{}";
export const CARGO_SECTIONS = ["dependencies", "dev-dependencies", "build-dependencies"];

export type Ecosystem = "npm" | "crate" | "pypi" | "go";
export type Dep = [Ecosystem, string];

export async function fetchJson(url: string, timeoutMs = 15000): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return {};
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Follows up to `hops` redirects. 0 means unreachable. */
export async function httpStatus(url: string, hops = 3): Promise<number> {
  let current = url;
  for (let hop = 0; hop < hops; hop += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return 0;
    }
    if (parsed.protocol !== "https:") return 0;
    try {
      const response = await fetch(current, {
        headers: UA,
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      const location = response.headers.get("location") ?? "";
      if ([301, 302, 303, 307, 308].includes(response.status) && location) {
        current = location.startsWith("http") ? location : `https://${parsed.hostname}${location}`;
        continue;
      }
      return response.status;
    } catch {
      return 0;
    }
  }
  return 0;
}

export function githubOwner(...candidates: unknown[]): string {
  for (const value of candidates) {
    const text =
      typeof value === "string" ? value : ((value as { url?: string } | null)?.url ?? "");
    const match = /github\.com[/:]([A-Za-z0-9_.-]+)\//.exec(text);
    if (match) return match[1];
  }
  return "";
}

export function repoOwner(repoDir: string): string {
  try {
    const remote = execFileSync("git", ["-C", repoDir, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    return githubOwner(remote);
  } catch {
    return "";
  }
}

type NpmFunding = string | { url?: string } | Array<string | { url?: string }>;

export async function npmFunding(name: string): Promise<string[]> {
  const data = await fetchJson(`https://registry.npmjs.org/${name}/latest`);
  const funding = data.funding as NpmFunding | undefined;
  let urls: string[] = [];
  if (typeof funding === "string") urls = [funding];
  else if (Array.isArray(funding)) urls = funding.map((entry) => (typeof entry === "string" ? entry : entry.url ?? ""));
  else if (funding && typeof funding === "object") urls = [funding.url ?? ""];
  urls = urls.filter(Boolean);
  if (urls.length > 0) return urls;
  const owner = githubOwner(data.repository, data.homepage);
  return owner ? [SPONSORS.replace("{}", owner)] : [];
}

export async function crateFunding(name: string): Promise<string[]> {
  const data = await fetchJson(`https://crates.io/api/v1/crates/${name}`);
  const owner = githubOwner((data.crate as { repository?: string } | undefined)?.repository);
  return owner ? [SPONSORS.replace("{}", owner)] : [];
}

export async function pypiFunding(name: string): Promise<string[]> {
  const data = await fetchJson(`https://pypi.org/pypi/${name}/json`);
  const info = (data.info ?? {}) as { project_urls?: Record<string, string>; home_page?: string };
  const urls = Object.entries(info.project_urls ?? {})
    .filter(([key, value]) => /fund|sponsor|donat/i.test(key) && value)
    .map(([, value]) => value);
  if (urls.length > 0) return urls;
  const owner = githubOwner(info.home_page, ...Object.values(info.project_urls ?? {}));
  return owner ? [SPONSORS.replace("{}", owner)] : [];
}

export function resolve(ecosystem: Ecosystem, name: string): Promise<string[]> {
  if (ecosystem === "npm") return npmFunding(name);
  if (ecosystem === "crate") return crateFunding(name);
  if (ecosystem === "pypi") return pypiFunding(name);
  return Promise.resolve([]);
}

function cell(line: string): string {
  return line.split("#")[0].trim();
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse((await readFile(path, "utf8")) || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function walk(dir: string, filename: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "target") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path, filename)));
    else if (entry.name === filename) found.push(path);
  }
  return found;
}

export async function parseManifests(repoDir: string): Promise<Dep[]> {
  const found = new Set<string>();
  const add = (ecosystem: Ecosystem, name: string): void => {
    found.add(`${ecosystem}\u0000${name}`);
  };

  for (const manifest of await walk(repoDir, "package.json")) {
    const data = await readJson(manifest);
    for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      for (const name of Object.keys((data[key] ?? {}) as Record<string, string>)) add("npm", name);
    }
  }

  for (const manifest of await walk(repoDir, "Cargo.toml")) {
    let section = "";
    for (const raw of (await readFile(manifest, "utf8")).split("\n")) {
      const line = cell(raw);
      if (line.startsWith("[")) {
        section = line.replace(/[[\]]/g, "");
        continue;
      }
      const match = /^([A-Za-z0-9_-]+)\s*=/.exec(line);
      if (match && CARGO_SECTIONS.includes(section)) add("crate", match[1]);
    }
  }

  for (const manifest of await walk(repoDir, "pyproject.toml")) {
    const text = await readFile(manifest, "utf8");
    for (const block of text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/g) ?? []) {
      for (const spec of block.match(/["']([^"']+)["']/g) ?? []) {
        const name = spec.slice(1, -1).trim().split(/[<>=!~[;\s]/)[0];
        if (name) add("pypi", name.toLowerCase());
      }
    }
  }

  for (const manifest of await walk(repoDir, "go.mod")) {
    const text = await readFile(manifest, "utf8");
    for (const match of text.matchAll(/^\s+([\w.\-/]+\.[\w.\-/]+)\s+v/gm)) add("go", match[1]);
  }

  return [...found]
    .map((entry) => entry.split("\u0000") as Dep)
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
}

export function digest(deps: Dep[]): string {
  return createHash("sha256").update(deps.map(([ecosystem, name]) => `${ecosystem}:${name}`).join("\n")).digest("hex");
}

/** Runs `worker` over items with a fixed concurrency, preserving order. */
export async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function lane(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
