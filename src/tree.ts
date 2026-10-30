import { createHash } from "node:crypto";
import { cp, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const MARKER = ".agentic";

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(dir, prefix), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await listFiles(dir, rel)));
    else files.push(rel);
  }
  return files;
}

export async function treeHash(dir: string): Promise<string> {
  const files = (await listFiles(dir)).filter((file) => file !== MARKER).sort();
  const hash = createHash("sha256");
  for (const rel of files) {
    hash.update(`${rel}\0`);
    hash.update(await readFile(join(dir, rel)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function copyTree(from: string, to: string): Promise<void> {
  await cp(from, to, { recursive: true });
}
