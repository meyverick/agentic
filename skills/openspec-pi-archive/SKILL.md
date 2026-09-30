---
name: openspec-pi-archive
description: >
  Delegate OpenSpec change archiving and delta specification merging to a headless pi worker agent via JSON-RPC.
  Use when the user wants to archive an OpenSpec change using pi as a worker engine,
  saying "pi archive", "opsx pi archive", or "archive change with pi".
  Do NOT use when archiving changes directly without pi (use openspec-archive-change),
  or when implementing tasks (use openspec-pi-apply or openspec-apply-change).
allowed-tools: Bash(bun:*), Bash(openspec:*), Read, Grep
license: MIT
compatibility: Requires pi CLI, bun, and openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
positive_triggers:
  - "archive change using pi"
  - "pi archive change"
  - "openspec pi archive"
  - "delegate archiving to pi"
anti_triggers:
  - "archive change directly yourself"
  - "archive change without pi"
  - "openspec archive change"
  - "apply change with pi"
---

# OpenSpec Pi Archive Workflow

Delegate delta specification merging and change archiving for a completed OpenSpec change to a headless `pi` worker engine communicating over JSON-RPC. Antigravity acts as architectural supervisor, triaging sync options and enforcing post-archive verification gates.

## Contrast Matrix

| Dimension | Direct Supervisor (`openspec-archive-change`) | Headless Pi Worker (`openspec-pi-archive`) | Why Different |
| :--- | :--- | :--- | :--- |
| **Execution** | Supervisor reads all delta/main specs directly in turn context | Child process worker (`pi -a --session-id openspec-<name> --mode rpc`) performs spec merges & directory move | Eliminates supervisor context bloat from large specification ASTs |
| **Session Model** | Fresh context turn | Reuses active apply session (`openspec-<name>`) | Pi preserves implementation reasoning when merging delta specs |
| **Sync Triaging** | Prompt-driven within supervisor turn | Runner surfaces worker prompts; supervisor replies via `--reply` | Decouples mechanical file operations from architectural consent |
| **Verification** | Self-checking | Physical invariant verification (directory relocation & `openspec validate`) | Independent external audit ensures repository integrity |

## Anti-Examples (What NOT to do)

- **Do NOT manually merge specifications or move directories** in this workflow. Archive execution is delegated to the worker process via `.agents/skills/openspec-pi-archive/scripts/pi-rpc-archive.ts`.
- **Do NOT pipe raw `pi` stdout directly** into conversational logs. Always use the bridge runner to filter token-level noise.
- **Do NOT assume the change is archived** based solely on conversational worker claims. The runner checks physical folder movement and spec validation.
- **Do NOT archive if tasks remain incomplete**. Verify `openspec list --json` reports `completedTasks === totalTasks` before triggering archive delegation.

## Workflow — 5 Steps

### Step 1: Pre-Flight & Change Inspection

1. Identify target change name and verify all tasks are complete:
   ```bash
   openspec list --json
   ```
   Confirm `completedTasks === totalTasks`. If tasks are unfinished, advise completing them with `/openspec-pi-apply <name>` first.
2. Inspect delta spec presence and readiness:
   ```bash
   openspec status --change "<name>" --json
   ```
   Confirm that all required planning artifacts are complete (`isPlanningComplete: true`).

### Step 2: Spawn Pi Worker Engine

Run the archive bridge runner from the workspace root:
```bash
bun run .agents/skills/openspec-pi-archive/scripts/pi-rpc-archive.ts --change "<name>"
```

*(To bypass past apply session history and start fresh, add `--fresh`)*

*(For low-level RPC framing specifications, see [references/rpc-protocol.md](references/rpc-protocol.md).)*

The runner:
- Resolves workspace root and spawns `pi -a --session-id "openspec-<name>" --mode rpc`
- Reuses the active implementation session, allowing Pi to leverage its turn memory of changes made
- Transmits `/skill:openspec-archive-change <name>` over stdin
- Filters token streaming events, surfacing structured tool executions (`⚙ [pi:tool] Invoking: ...`)
- Detects `agent_settled` upon turn completion

### Step 3: Triage Worker Settlement State

Evaluate the runner's exit status:

#### Case A: `[STATUS] COMPLETED`
The change directory has been relocated to `openspec/changes/archive/` and specifications validate cleanly.
- Proceed directly to **Step 5: Post-Archive Verification**.

#### Case B: `[STATUS] PAUSED_FOR_CLARIFICATION`
Worker paused before completing the archive (e.g. asking whether to sync delta specs into main specs or resolving merge conflicts).
1. Read the worker's prompt from the runner output.
2. If the worker asks for interactive sync confirmation ("Sync now", "Archive without syncing"):
   - Prompt the user or confirm intent.
   - Resume execution with the selected option:
     ```bash
     bun run .agents/skills/openspec-pi-archive/scripts/pi-rpc-archive.ts --change "<name>" --reply "Sync now"
     ```
3. Return to **Step 3** to inspect the subsequent settlement state.

#### Case C: `[STATUS] FAILED`
Worker exited with an error or timed out without moving the directory.
- Inspect diagnostic stderr logs.
- Report failure details to the user and pause.

### Step 4: Resume Iteration Loop

Repeat Step 3 until `[STATUS] COMPLETED` is confirmed or user intervention is requested.

### Step 5: Post-Archive Verification

1. Run workspace specification validation:
   ```bash
   openspec validate
   ```
2. Inspect git status to verify clean spec updates and directory moves:
   ```bash
   git status --short
   ```
3. Present final archive summary:
   - Change name
   - Archived directory location
   - Specification sync status
