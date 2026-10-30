#!/usr/bin/env bun
import { install } from "./install.ts";
import { initWorkspace } from "./workspace.ts";
import { homeDir, loadPackage, targets } from "./pkg.ts";
import { collect, drift, render } from "./status.ts";

const FLAGS = new Set(["--force", "--dry-run", "--no-openspec", "--no-codegraph", "--init", "-h", "--help", "-v", "--version"]);
const COMMANDS = new Set(["install", "status"]);

export interface Env {
  home: string;
  out: (line: string) => void;
  cwd?: string;
}

export function usage(version: string): string[] {
  return [
    `agentic ${version}`,
    "",
    "usage:",
    "  agentic [install] [--force] [--dry-run]   install or update rulebooks and owned skills",
    "  agentic --init                            scaffold a workspace in the current directory",
    "  agentic status                            report drift against shipped content",
    "  agentic --version                         print the package version",
    "",
    "  --force       replace unmarked directories that occupy a shipped skill name",
    "  --dry-run     report the plan without touching the filesystem",
    "  --no-openspec skip the OpenSpec CLI update and its skills (install and --init)",
    "  --no-codegraph skip the code graph CLI update and its index (--init only)",
  ];
}

export async function run(argv: string[], env: Env): Promise<number> {
  const pkg = await loadPackage(import.meta.dir);
  const t = targets(env.home);

  const unknownFlags = argv.filter((arg) => arg.startsWith("-") && !FLAGS.has(arg));
  if (unknownFlags.length > 0) {
    env.out(`unknown flag: ${unknownFlags[0]}`);
    usage(pkg.version).forEach(env.out);
    return 2;
  }

  if (argv.includes("-h") || argv.includes("--help")) {
    usage(pkg.version).forEach(env.out);
    return 0;
  }
  if (argv.includes("-v") || argv.includes("--version")) {
    env.out(pkg.version);
    return 0;
  }

  const positionals = argv.filter((arg) => !arg.startsWith("-"));
  if (positionals.length > 1) {
    env.out(`unexpected argument: ${positionals[1]}`);
    usage(pkg.version).forEach(env.out);
    return 2;
  }

  if (argv.includes("--init")) {
    if (positionals.length > 0) {
      env.out(`unexpected argument: ${positionals[0]}`);
      usage(pkg.version).forEach(env.out);
      return 2;
    }
    return initWorkspace(
      env.cwd ?? process.cwd(),
      pkg.root,
      {
        force: argv.includes("--force"),
        dryRun: argv.includes("--dry-run"),
        openspec: !argv.includes("--no-openspec"),
        codegraph: !argv.includes("--no-codegraph"),
      },
      env.out,
    );
  }

  const command = positionals[0] ?? "install";
  if (!COMMANDS.has(command)) {
    env.out(`unknown command: ${command}`);
    usage(pkg.version).forEach(env.out);
    return 2;
  }

  if (command === "status") {
    const report = await collect(pkg, t);
    render(report, env.out);
    return drift(report) ? 1 : 0;
  }

  return install(
    pkg,
    t,
    { force: argv.includes("--force"), dryRun: argv.includes("--dry-run"), openspec: !argv.includes("--no-openspec") },
    env.out,
  );
}

if (import.meta.main) {
  const code = await run(process.argv.slice(2), { home: homeDir(), out: (line) => console.log(line) });
  process.exitCode = code;
}
