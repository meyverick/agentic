import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { resolve, basename, extname, join, relative } from "node:path";
import type { ScannedContext, ScannedFile } from "./strategies/types.js";

const DEFAULT_MAX_FILES = 50;
const DEFAULT_MAX_BYTES = 500 * 1024; // 500KB
const DEFAULT_MAX_LINES_PER_FILE = 2000;

const IGNORED_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "target",
  "vendor",
  ".turbo",
  ".next",
  ".svelte-kit",
  "build",
  "coverage",
]);

const LOCKFILE_NAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "Cargo.lock",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".wasm",
  ".exe",
  ".dylib",
  ".so",
  ".bin",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

const SENSITIVE_EXTENSIONS = new Set([".pem", ".key", ".p12", ".pfx"]);

export function isSecretFile(filePath: string): boolean {
  const name = basename(filePath).toLowerCase();
  const ext = extname(name);

  if (name.startsWith(".env")) return true;
  if (SENSITIVE_EXTENSIONS.has(ext)) return true;
  if (name.startsWith("id_rsa") || name.startsWith("id_ed25519") || name.startsWith("id_ecdsa")) return true;
  if (name.startsWith("credentials.")) return true;

  return false;
}

export function isBinaryOrLockfile(filePath: string): boolean {
  const name = basename(filePath);
  const ext = extname(name).toLowerCase();

  if (LOCKFILE_NAMES.has(name)) return true;
  if (BINARY_EXTENSIONS.has(ext)) return true;

  return false;
}

function hasBinaryBytes(buffer: Buffer): boolean {
  const checkLen = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export interface ScannerOptions {
  maxFiles?: number;
  maxBytes?: number;
  maxLinesPerFile?: number;
  cwd?: string;
}

export function scanReferences(
  rawPaths: string[],
  options: ScannerOptions = {}
): ScannedContext {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxLinesPerFile = options.maxLinesPerFile ?? DEFAULT_MAX_LINES_PER_FILE;
  const cwd = options.cwd ?? process.cwd();

  const collectedFiles: ScannedFile[] = [];
  const excludedPaths: string[] = [];
  let totalBytes = 0;
  let totalLines = 0;
  let truncated = false;

  const seenPaths = new Set<string>();

  function walk(currentPath: string): void {
    if (collectedFiles.length >= maxFiles || totalBytes >= maxBytes) {
      truncated = true;
      return;
    }

    if (!existsSync(currentPath)) {
      console.error(`[select-model] Warning: reference path not found: ${currentPath}`);
      return;
    }

    const stat = statSync(currentPath);

    if (stat.isDirectory()) {
      const dirName = basename(currentPath);
      if (IGNORED_DIR_NAMES.has(dirName)) {
        excludedPaths.push(currentPath);
        return;
      }

      let entries: string[] = [];
      try {
        entries = readdirSync(currentPath);
      } catch (err) {
        console.error(`[select-model] Warning: cannot read directory ${currentPath}: ${String(err)}`);
        return;
      }

      for (const entry of entries) {
        if (collectedFiles.length >= maxFiles || totalBytes >= maxBytes) {
          truncated = true;
          break;
        }
        walk(join(currentPath, entry));
      }
      return;
    }

    if (!stat.isFile()) return;

    const realPath = resolve(currentPath);
    if (seenPaths.has(realPath)) return;
    seenPaths.add(realPath);

    if (isSecretFile(currentPath)) {
      excludedPaths.push(currentPath);
      console.error(`[select-model] Security warning: skipping sensitive reference: ${currentPath}`);
      return;
    }

    if (isBinaryOrLockfile(currentPath)) {
      excludedPaths.push(currentPath);
      return;
    }

    try {
      const buffer = readFileSync(currentPath);
      if (hasBinaryBytes(buffer)) {
        excludedPaths.push(currentPath);
        return;
      }

      let text = buffer.toString("utf8");
      const lines = text.split("\n");
      const originalLineCount = lines.length;

      if (originalLineCount > maxLinesPerFile) {
        text = lines.slice(0, maxLinesPerFile).join("\n") + "\n// ... [truncated large file]";
      }

      const fileBytes = Buffer.byteLength(text, "utf8");

      if (totalBytes + fileBytes > maxBytes && collectedFiles.length > 0) {
        truncated = true;
        return;
      }

      const relPath = relative(cwd, currentPath) || currentPath;
      const scannedLines = Math.min(originalLineCount, maxLinesPerFile);

      collectedFiles.push({
        path: relPath,
        content: text,
        lineCount: scannedLines,
        byteSize: fileBytes,
      });

      totalBytes += fileBytes;
      totalLines += scannedLines;
    } catch (err) {
      console.error(`[select-model] Warning: error reading file ${currentPath}: ${String(err)}`);
    }
  }

  for (const rawPath of rawPaths) {
    if (!rawPath.trim()) continue;
    walk(resolve(cwd, rawPath.trim()));
  }

  if (truncated) {
    console.error(
      `[select-model] Warning: reference context truncated at budget limit (${maxFiles} files / ${Math.round(
        maxBytes / 1024
      )}KB)`
    );
  }

  return {
    files: collectedFiles,
    totalFiles: collectedFiles.length,
    totalBytes,
    totalLines,
    truncated,
    excludedPaths,
  };
}
