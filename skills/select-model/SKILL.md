---
name: select-model
description: Intelligently and deterministically select the optimal LLM model, provider, and reasoning/thinking level for an engineering task based on prompt text and optional code references. Use when dynamically sizing models for tasks, dispatching subagents, or configuring execution runners. Do NOT use for running model inferences, managing credentials, or benchmarking code.
---

# select-model — Dynamic Model & Reasoning Selector

A standalone, decoupled skill and CLI utility that inspects task prompts and contextual code references to select the most appropriate and cost-effective LLM model, provider, and thinking level.

## Core Mental Model

`select-model` acts as a pure decision engine. It does not execute inferences or modify application code. Instead, it inspects task complexity against an authoritative model catalog and emits an unconditional structured JSON parameter envelope to standard output.

```
Task Prompt + Code References
             │
             ▼
   [ select-model CLI ]
   ├── Strategy: TypeSafe Jev SDK (default) | Heuristic Matrix
   └── Catalog: references/models.json
             │
             ▼
{ model, provider, thinking_level, confidence, reasoning }
```

## CLI Invocation & Options

The tool is authored in TypeScript and executed via `bun`:

```bash
bun scripts/select-model.ts \
  --prompt "<prompt>" \
  [--references <path...>] \
  [--strategy <jev|heuristic>] \
  [--catalog <path>]
```

### Options
* `-p, --prompt <string>` *(required)*: Task intent, description, or instructions to analyze.
* `-r, --references <path...>` *(optional)*: One or more file or directory paths to include in evaluation context.
* `-s, --strategy <strategy>` *(optional, default: `jev`)*:
  * `jev`: Semantic classification via TypeSafe Jev SDK (`@typesafe-ai/sdk`). Requires `TYPESAFE_API_KEY`.
  * `heuristic`: Deterministic offline classifier scoring keyword taxonomy, prompt length, and AST/LOC metrics.
* `-c, --catalog <path>` *(optional)*: Path to custom `models.json` catalog (defaults to bundled `references/models.json`).
* `-h, --help`: Display usage and exit.

## Downstream Piping Recipes

Standard output is exclusively formatted JSON, making it directly consumable by shell pipelines or downstream runner scripts:

```bash
# Capture selection
PARAMS=$(bun scripts/select-model.ts \
  --strategy heuristic \
  --prompt "Refactor user authentication service" \
  --references ./src/auth.ts ./src/storage.ts)

MODEL=$(echo "$PARAMS" | jq -r .model)
PROVIDER=$(echo "$PARAMS" | jq -r .provider)
THINKING=$(echo "$PARAMS" | jq -r .thinking_level)

echo "Selected $MODEL ($PROVIDER) with thinking level: $THINKING"
```

## Reference Curation Guidelines

1. **Target Specific Context**: Do not pass the entire workspace root. Pass specific files or cohesive component directories relevant to the task.
2. **Automatic Default-Deny Exclusions**: The scanner automatically skips:
   * Build & dependency artifacts: `.git`, `node_modules`, `dist`, `target`, `vendor`, `.turbo`.
   * Lockfiles: `bun.lock`, `bun.lockb`, `package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`.
   * Binaries, archives, and fonts (`.wasm`, `.png`, `.zip`, etc.).
   * Secret files: `.env*`, `*.pem`, `*.key`, `id_rsa*`, `credentials.*`.
3. **Context Budgeting**: Ingestion is capped at **50 files** and **500KB total text** (max 2,000 lines per file). Excess files trigger a non-fatal warning on stderr.

## Sequential Workflow

1. **Intake**: Gather task description and identify relevant source reference paths.
2. **Strategy Selection**:
   * If `TYPESAFE_API_KEY` is present in the environment: invoke default `jev` strategy for high semantic accuracy.
   * If running offline, in CI, or without API keys: explicitly pass `--strategy heuristic`.
3. **Execution**: Run `bun scripts/select-model.ts ...`.
4. **Validation**: Emitted `thinking_level` is guaranteed to be clamped and supported by the selected model's `levels` list in `models.json`.

## Gotchas & Failure Recovery

* **Missing `TYPESAFE_API_KEY` (Exit Code 1)**:
  * When using default `jev` without `TYPESAFE_API_KEY`, the tool fails fast with exit status 1.
  * *Fix*: Set `export TYPESAFE_API_KEY=...` or invoke with `--strategy heuristic`.
* **Explicit Sensitive File Path**:
  * Passing `.env` directly will not leak credentials; the scanner will log a security warning to stderr and completely omit the file content.
