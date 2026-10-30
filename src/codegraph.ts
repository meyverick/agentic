/** Code graph lane: ensure the CLI, then build the workspace index with no watcher left behind. */
import { spawnSync } from "node:child_process";

import { ensureGlobal, inspectCli, reportCli } from "./tooling.ts";
import type { Emit } from "./tooling.ts";

export const CLI_PACKAGE = "@colbymchenry/codegraph@latest";
export const NODE_MIN_MAJOR = 20;
/** Exclusive upper bound the CLI declares at adoption time; advisory, not enforced. */
export const NODE_MAX_MAJOR = 25;
const INDEX_TIMEOUT_MS = 180_000;

export interface NodeCheck {
  version: string;
  major: number;
}

/** The graph CLI is a Node program, so Node must resolve before anything else in this lane. */
export function inspectNode(): NodeCheck {
  const resolved = Bun.which("node");
  if (!resolved) {
    throw new Error(`Node is required for the code graph lane but was not found on the path`);
  }
  const probe = spawnSync(resolved, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const version = (probe.stdout ?? "").trim().replace(/^v/, "");
  const major = Number(version.split(".")[0]);
  if (!Number.isFinite(major)) {
    throw new Error(`could not read the Node version from '${(probe.stdout ?? "").trim()}'`);
  }
  return { version, major };
}

/** Installs or updates the CLI, then reports what the path actually resolves. */
export function prepare(emit: Emit): void {
  const node = inspectNode();
  if (node.major < NODE_MIN_MAJOR || node.major >= NODE_MAX_MAJOR) {
    emit(`codegraph  WARN Node ${node.version} is outside the declared range (>=${NODE_MIN_MAJOR} <${NODE_MAX_MAJOR})`);
  }
  ensureGlobal(CLI_PACKAGE);
  reportCli("codegraph", "codegraph", inspectCli("codegraph"), emit);
}

/** Builds the index in one non-interactive pass with the background watcher disabled. */
export function buildIndex(target: string): void {
  const bin = Bun.which("codegraph") ?? "codegraph";
  const result = spawnSync(bin, ["init", "-y", "."], {
    cwd: target,
    encoding: "utf8",
    env: { ...process.env, CODEGRAPH_NO_DAEMON: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: INDEX_TIMEOUT_MS,
    shell: process.platform === "win32",
  });

  if (result.error) throw new Error(`code graph index failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().split("\n").slice(-1)[0];
    throw new Error(`code graph index failed: ${detail || `exit ${result.status}`}`);
  }
}
