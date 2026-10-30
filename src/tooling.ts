/** Shared plumbing for globally installed tool CLIs: install, resolve, report, warn. */
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";

export interface CliCheck {
  path: string | null;
  version: string | null;
  shadowed: boolean;
}

export interface Emit {
  (line: string): void;
}

/** Installs or updates a package globally through the runtime this tool already requires. */
export function ensureGlobal(pkg: string): void {
  const result = spawnSync("bun", ["add", "-g", pkg], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().split("\n")[0];
    throw new Error(`${pkg} update failed: ${detail}`);
  }
}

/** Resolves an executable on the path and reports where it came from and what it claims to be. */
export function inspectCli(bin: string): CliCheck {
  const resolved = Bun.which(bin);
  if (!resolved) return { path: null, version: null, shadowed: false };

  // A .cmd shim cannot be spawned directly on Windows; let the shell resolve it there.
  const probe = spawnSync(resolved, ["--version"], {
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const version = probe.stdout?.trim() || null;

  let shadowed = false;
  try {
    shadowed = realpathSync(dirname(resolved)) !== realpathSync(join(homedir(), ".bun", "bin"));
  } catch {
    shadowed = true;
  }
  return { path: resolved, version, shadowed };
}

/** Reports the resolved CLI, warning when another installed copy wins the path lookup. */
export function reportCli(label: string, bin: string, check: CliCheck, emit: Emit): void {
  emit(`${label} CLI ${check.version ?? "unknown"} at ${check.path ?? "unresolved"}`);
  if (check.shadowed) {
    emit(`${label} WARN ${basename(check.path ?? bin)} resolves ahead of the updated copy in ${join(homedir(), ".bun", "bin")}`);
  }
}
