---
name: openspec-pi-apply
description: >
  Delegate OpenSpec change task implementation to a headless pi worker agent via JSON-RPC.
  Use when the user wants to apply an OpenSpec change using pi as a worker engine,
  saying "pi apply", "opsx pi apply", or "apply change with pi".
  Do NOT use when applying changes directly without pi (use openspec-apply-change),
  or when proposing/planning changes (use openspec-propose).
allowed-tools: Bash(bun:*), Bash(openspec:*), Read, Grep
license: MIT
compatibility: Requires pi CLI, bun, and openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
positive_triggers:
  - "apply change using pi"
  - "pi apply change"
  - "openspec pi apply"
  - "delegate task implementation to pi"
anti_triggers:
  - "implement change directly yourself"
  - "apply change without pi"
  - "openspec apply change"
  - "propose a new change"
---

# OpenSpec Pi Apply Workflow

Delegate task execution for an active OpenSpec change to a headless `pi` worker engine communicating over JSON-RPC. Antigravity acts as architectural supervisor, triaging worker questions and enforcing verification gates.

## Contrast Matrix

| Dimension | Direct Supervisor (`openspec-apply-change`) | Headless Pi Worker (`openspec-pi-apply`) | Why Different |
| :--- | :--- | :--- | :--- |
| **Execution** | Supervisor edits project files directly in turn context | Child process worker (`pi -a --session-id openspec-<name> --mode rpc`) executes edits | Prevents supervisor context bloat & high turn latency |
| **Supervision** | Self-directed implementation | Supervisor monitors tool events & validates completion gates | Decouples code authoring from architectural oversight |
| **Clarifications** | Halts and asks human immediately | Supervisor triages autonomously against change artifacts | Eliminates unnecessary user interruptions for specified details |

## Anti-Examples (What NOT to do)

- **Do NOT edit project files directly** in this workflow. Task implementation is delegated to the worker process via `.agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts`.
- **Do NOT pipe raw `pi` stdout directly** into conversational logs. Always use the bridge runner to filter high-frequency token deltas and prevent buffer stalls.
- **Do NOT guess unstated requirements** when the worker pauses for clarification. If an answer cannot be grounded in `specs/`, `design.md`, or `AGENTS.md`, escalate to the user.
- **Do NOT mark the change complete** based solely on worker claims. Verify that `openspec instructions apply --change <name> --json` confirms 0 remaining tasks.

## Workflow — 5 Steps

### Step 1: Pre-Flight & Change Discovery

1. Identify target change name (from user input or active changes):
   ```bash
   openspec list --json
   ```
2. Verify that planning artifacts are complete:
   ```bash
   openspec status --change "<name>" --json
   ```
   Ensure `isPlanningComplete: true`. If planning is incomplete, advise completing artifacts with `/openspec-continue-change` first.

### Step 2: Spawn Pi Worker Engine

Run the bridge runner from the workspace root:
```bash
bun run .agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts --change "<name>"
```

*(For low-level RPC framing specifications, see [references/rpc-protocol.md](references/rpc-protocol.md).)*

The runner:
- Resolves workspace root and spawns `pi -a --session-id "openspec-<name>" --mode rpc`
- Enforces change-scoped session isolation, preventing contamination from previous interactive chats or other changes
- Transmits `/skill:openspec-apply-change <name>` over stdin
- Filters raw token noise, emitting clean progress logs (`⚙ [pi:tool] Invoking: ...`)
- Detects `agent_settled` upon turn completion

### Step 3: Triage Worker Settlement State

Evaluate the runner's exit status:

#### Case A: `[STATUS] COMPLETED`
All tasks in `tasks.md` are marked complete (`remaining: 0`).
- Proceed directly to **Step 5: Completion Verification**.

#### Case B: `[STATUS] PAUSED_FOR_CLARIFICATION`
Worker paused with remaining tasks or posted a question before finishing.
1. Read the worker's question from the runner log.
2. Cross-reference the question against:
   - `openspec/changes/<name>/specs/**/*.md`
   - `openspec/changes/<name>/design.md`
   - `openspec/changes/<name>/proposal.md`
   - `AGENTS.md`
3. **Autonomous Resolution**:
   - If the answer is documented in specifications or conventions, formulate the concise clarification grounded in the artifacts and resume worker execution:
     ```bash
     bun run .agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts --change "<name>" --reply "<clarification-answer>"
     ```
   - Return to **Step 3** to inspect the next settlement state.
4. **Human Escalation**:
   - If the question involves domain ambiguity, product preference, or missing credentials not covered by specs:
   - Ask the user directly.
   - Once the user answers, resume worker execution:
     ```bash
     bun run .agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts --change "<name>" --reply "<user-answer>"
     ```
   - Return to **Step 3**.

#### Case C: `[STATUS] FAILED`
Worker exited with an error or timed out.
- Inspect stderr and diagnostic logs.
- Report failure details to user and pause.

### Step 4: Resume Iteration Loop

Repeat Step 3 until `[STATUS] COMPLETED` is reached or user intervention is requested.

### Step 5: Completion Verification

1. Run OpenSpec apply inspection:
   ```bash
   openspec instructions apply --change "<name>" --json
   ```
2. Confirm `progress.remaining === 0`.
3. Run project verification suite (linters, typecheck, or tests) to confirm workspace health:
   ```bash
   openspec validate --change "<name>"
   ```
4. Present final implementation summary:
   - Change name and status
   - Completed task summary
   - Prompt user to archive: "All tasks complete! You can archive this change with `/openspec-archive-change <name>`."
