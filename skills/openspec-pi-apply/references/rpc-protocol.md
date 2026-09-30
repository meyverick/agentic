# Pi JSON-RPC Protocol Reference

This reference outlines the JSON-RPC framing, lifecycle events, and process configuration used by `scripts/pi-rpc-apply.ts` and `scripts/pi-rpc-archive.ts` to control headless `pi` subprocesses.

## Process Invocation Flags

- `-a` (`--approve`): Auto-approves operations within project scope, preventing interactive confirmation prompts.
- `--session-id "openspec-<change-name>"`: Enforces change-scoped session isolation. Reuses the exact session across worker turns, preventing contamination from unrelated workspace history while preserving implementation context.
- `-c` (`--continue`): Fallback flag maintaining the most recent workspace session only when no change name is provided.
- `--mode rpc`: Activates bidirectional JSON-RPC 2.0 streaming over standard I/O.

## Standard Input Commands

### Initial Prompt Command
Transmits the workflow entry point to Pi:
```json
{
  "id": "prompt-1",
  "type": "prompt",
  "message": "/skill:openspec-apply-change <change-name>"
}
```
*Note*: `pi` natively expands `/skill:name` commands prior to session execution.

### Clarification / Triage Reply
Resumes a paused worker session with an answer or user decision:
```json
{
  "id": "prompt-reply",
  "type": "prompt",
  "message": "<clarification-answer>"
}
```

## Protocol Record Families

The protocol communicates via LF-terminated (`\n`) JSON objects across four record families:

| Direction | Record Family | Purpose |
| :--- | :--- | :--- |
| **stdin** | Command | Prompt submission, session inspection, and control |
| **stdout** | Response | Command acknowledgement (`success: true|false`), data payload, or error |
| **stdout** | Session Event | Real-time run lifecycle, tool calls, message completions, and settlement |
| **bidirectional** | Extension UI | Dialog requests (`select`, `confirm`, `input`, `editor`) and matching responses |

## Event Stream & Filtering

1. **`message_update` (suppressed by runner)**:
   Emits high-frequency token deltas (`text_delta`, `thinking_delta`). The runner discards these to prevent buffer stalls and log flooding.
2. **`toolcall_start` / `toolcall_end`**:
   Emitted when `pi` invokes or settles workspace tools. Formatted by the runner as clean operational status:
   - `⚙ [pi:tool] Invoking: <tool-name>`
   - `✓ [pi:tool] Completed: <tool-name>`
3. **`message_end`**:
   Emitted when the assistant completes a message turn. Captured by the runner to log assistant output and extract pending worker questions.
4. **`agent_settled`**:
   Emitted when the agent finishes its autonomous run loop and has no pending actions. The runner uses this signal to perform invariant verification.

## Extension UI Sub-Protocol

Interactive extensions and plugins may emit `extension_ui_request` on stdout requiring client resolution:
```json
{
  "type": "extension_ui_request",
  "id": "req-123",
  "method": "select",
  "options": ["Sync now", "Archive without syncing"]
}
```
The runner auto-resolves dialog requests on stdin with an `extension_ui_response` using default or prefilled values:
```json
{
  "type": "extension_ui_response",
  "id": "req-123",
  "value": "Sync now"
}
```
This ensures headless execution does not deadlock on unhandled UI dialogs.

## Framing & Backpressure Rules

- **Strict LF Boundaries**: Records are newline-delimited JSON (`\n`). Carriage returns (`\r`) are stripped prior to JSON parsing.
- **Continuous Drain**: Stdout is drained continuously via stream listeners to avoid backpressure stalls.
- **Channel Separation**: Stdout is reserved strictly for JSON-RPC records; diagnostics and errors route to stderr.
