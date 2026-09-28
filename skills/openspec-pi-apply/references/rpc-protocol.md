# Pi JSON-RPC Protocol Reference (Level 2)

This reference outlines the JSON-RPC framing and event specifications used by `scripts/pi-rpc-apply.ts` to control `pi -a -c --mode rpc`.

## Process Invocation Flags

- `-a` (`--approve`): Auto-approves operations within the project scope, preventing interactive confirmation prompts.
- `-c` (`--continue`): Maintains conversational session memory and context across turns and process restarts.
- `--mode rpc`: Activates bidirectional JSON-RPC 2.0 streaming over standard I/O.

## Standard Input Commands

### Initial Apply Prompt
```json
{
  "id": "prompt-1",
  "type": "prompt",
  "message": "/skill:openspec-apply-change <change-name>"
}
```
*Note*: `pi` natively expands `/skill:name` commands prior to session execution.

### Clarification Reply
```json
{
  "id": "prompt-reply",
  "type": "prompt",
  "message": "<clarification-answer>"
}
```

## Standard Output Stream & Framing

Records are strictly formatted as single-line JSON objects separated by LF (`\n`):

1. **`message_update` (suppressed by runner)**:
   Emits streaming deltas (`text_delta`, `thinking_delta`). Filtered out to avoid context flooding.
2. **`toolcall_start` / `toolcall_end`**:
   Emitted when `pi` executes workspace tools (`read_file`, `write_to_file`, `run_command`).
3. **`message_end`**:
   Emitted when the assistant finishes a response turn. Captured to extract any worker questions.
4. **`agent_settled`**:
   Signals that the agent has settled and has no remaining automatic work.
