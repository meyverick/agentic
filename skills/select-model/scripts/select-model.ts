#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { scanReferences } from "./scanner.js";
import { HeuristicStrategy } from "./strategies/heuristic.js";
import type { ModelCatalog, SelectorStrategy } from "./strategies/types.js";

function printUsage(): void {
  const usage = `Usage: select-model --prompt "<prompt>" [options]

Selects the optimal LLM model and thinking level based on prompt and code references.

Options:
  -p, --prompt <string>       Task description or user prompt (required)
  -r, --references <path...>  File or directory paths to include in context evaluation
  -s, --strategy <strategy>   Decision engine: 'jev' (default) or 'heuristic'
  -c, --catalog <path>        Path to custom model catalog JSON (default: references/models.json)
  -h, --help                  Show this help message and exit

Stdout is strictly formatted JSON. All warnings and errors are written to stderr.
`;
  process.stdout.write(usage);
}

interface ParsedArgs {
  prompt?: string;
  references: string[];
  strategy: "jev" | "heuristic";
  catalogPath?: string;
  help: boolean;
}

function parseCliArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    references: [],
    strategy: "jev",
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      result.help = true;
      return result;
    }

    if (arg === "-p" || arg === "--prompt") {
      i++;
      if (i >= argv.length) {
        console.error("[select-model] Error: --prompt requires an argument");
        process.exit(1);
      }
      result.prompt = argv[i];
      continue;
    }

    if (arg.startsWith("--prompt=")) {
      result.prompt = arg.slice("--prompt=".length);
      continue;
    }

    if (arg === "-s" || arg === "--strategy") {
      i++;
      if (i >= argv.length) {
        console.error("[select-model] Error: --strategy requires an argument ('jev' or 'heuristic')");
        process.exit(1);
      }
      const val = argv[i].toLowerCase();
      if (val !== "jev" && val !== "heuristic") {
        console.error(`[select-model] Error: invalid strategy "${val}". Must be 'jev' or 'heuristic'.`);
        process.exit(1);
      }
      result.strategy = val;
      continue;
    }

    if (arg.startsWith("--strategy=")) {
      const val = arg.slice("--strategy=".length).toLowerCase();
      if (val !== "jev" && val !== "heuristic") {
        console.error(`[select-model] Error: invalid strategy "${val}". Must be 'jev' or 'heuristic'.`);
        process.exit(1);
      }
      result.strategy = val;
      continue;
    }

    if (arg === "-c" || arg === "--catalog") {
      i++;
      if (i >= argv.length) {
        console.error("[select-model] Error: --catalog requires an argument");
        process.exit(1);
      }
      result.catalogPath = argv[i];
      continue;
    }

    if (arg.startsWith("--catalog=")) {
      result.catalogPath = arg.slice("--catalog=".length);
      continue;
    }

    if (arg === "-r" || arg === "--references") {
      i++;
      while (i < argv.length && !argv[i].startsWith("-")) {
        result.references.push(argv[i]);
        i++;
      }
      i--; // rewind one because outer loop will increment
      continue;
    }

    // Ignore --json flag if passed for backward compatibility
    if (arg === "--json") {
      continue;
    }

    console.error(`[select-model] Error: unknown argument "${arg}"`);
    process.exit(1);
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv);

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.prompt || !args.prompt.trim()) {
    console.error("[select-model] Error: missing required argument --prompt <string>");
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  const catalogFile = args.catalogPath
    ? resolve(process.cwd(), args.catalogPath)
    : resolve(import.meta.dir, "../references/models.json");

  if (!existsSync(catalogFile)) {
    console.error(`[select-model] Error: model catalog not found at: ${catalogFile}`);
    process.exit(1);
  }

  let catalog: ModelCatalog;
  try {
    const raw = readFileSync(catalogFile, "utf8");
    catalog = JSON.parse(raw) as ModelCatalog;
    if (!catalog.models || typeof catalog.models !== "object") {
      throw new Error("Catalog must define a 'models' object mapping model IDs to metadata.");
    }
  } catch (err) {
    console.error(`[select-model] Error: failed to parse model catalog: ${String(err)}`);
    process.exit(1);
  }

  const scannedContext = scanReferences(args.references, { cwd: process.cwd() });

  let strategy: SelectorStrategy;
  if (args.strategy === "heuristic") {
    strategy = new HeuristicStrategy();
  } else {
    const { JevStrategy } = await import("./strategies/jev.js");
    strategy = new JevStrategy();
  }

  try {
    const result = await strategy.select({
      prompt: args.prompt.trim(),
      context: scannedContext,
      catalog,
    });

    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(0);
  } catch (err) {
    console.error(`[select-model] Error during model selection: ${String(err)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[select-model] Unexpected failure: ${String(err)}`);
  process.exit(1);
});
