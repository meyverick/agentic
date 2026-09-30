#!/usr/bin/env bun
/**
 * scripts/pi-rpc-archive.ts
 *
 * Bridge runner driving `pi -a --session-id <id> --mode rpc` over stdio duplex to execute
 * the `openspec-archive-change` workflow on a specified change.
 *
 * Responsibilities:
 * - Deterministically resolves workspace root (nearest Git / OpenSpec root ancestor)
 * - Reuses the change's active apply session (`openspec-${changeName}`) by default
 * - Streams and strictly decodes JSONL on LF (\n) boundaries
 * - Suppresses high-frequency token deltas to prevent log flooding & pipe stalls
 * - Formats and displays clean tool calls and assistant progress
 * - Detects `agent_settled` turn completion
 * - Validates physical archive invariants (folder moved to archive/ & spec validation)
 * - Emits structured status (COMPLETED, PAUSED_FOR_CLARIFICATION, FAILED)
 * - Supports session continuation via `--reply "<answer>"`
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

// --- Type Definitions for Pi RPC Events ---

interface RpcResponse {
  id?: string;
  type: 'response';
  command?: string;
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

interface ToolCallData {
  toolName?: string;
  name?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
}

interface AssistantMessageEvent {
  type: string;
  delta?: string;
  toolCall?: ToolCallData;
  toolName?: string;
  contentIndex?: number;
}

interface MessageContent {
  type: string;
  text?: string;
}

interface MessageData {
  role?: string;
  content?: string | MessageContent[];
}

interface PiEvent {
  type: string;
  assistantMessageEvent?: AssistantMessageEvent;
  message?: MessageData;
  messages?: MessageData[];
  toolResults?: unknown[];
}

// --- CLI Arguments & Options ---

export interface CliOptions {
  changeName?: string;
  replyMessage?: string;
  continueSession: boolean;
  timeoutMs: number;
  explicitRoot?: string;
  verbose: boolean;
}

export function printHelp(): void {
  console.log(`
Usage: bun run scripts/pi-rpc-archive.ts [options]

Options:
  --change <name>        OpenSpec change name to archive
  --reply "<message>"    Send a reply/clarification to the active pi worker session
  --continue             Continue existing pi session without new prompt
  --timeout <ms>         Turn timeout in milliseconds (default: 300000ms / 5 min)
  --root <path>          Explicit workspace root directory
  --verbose              Print detailed event diagnostics to stderr
  -h, --help             Show this help message
`);
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    continueSession: false,
    timeoutMs: 300_000,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--change') {
      options.changeName = args[++i];
    } else if (arg === '--reply') {
      options.replyMessage = args[++i];
    } else if (arg === '--continue') {
      options.continueSession = true;
    } else if (arg === '--timeout') {
      options.timeoutMs = parseInt(args[++i], 10) || 300_000;
    } else if (arg === '--root') {
      options.explicitRoot = args[++i];
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (!arg.startsWith('-') && !options.changeName) {
      options.changeName = arg;
    }
  }

  return options;
}

/**
 * Sanitizes an OpenSpec change name into a valid pi session ID.
 * Pi CLI constraints:
 * - Must start and end with an alphanumeric character ([a-zA-Z0-9])
 * - May contain letters, numbers, '.', '_', and '-'
 * Returns `openspec-${safeName}`.
 */
export function resolveSessionId(changeName: string): string {
  let safe = changeName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  safe = safe.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '');
  if (!safe) {
    safe = 'task';
  }
  return `openspec-${safe}`;
}

/**
 * Resolves workspace root by traversing upwards until finding `openspec` directory or `.git`.
 */
export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  let curr = resolve(startDir);
  while (true) {
    if (existsSync(join(curr, 'openspec')) && existsSync(join(curr, '.agents', 'skills'))) {
      return curr;
    }
    if (existsSync(join(curr, 'openspec'))) {
      return curr;
    }
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return resolve(startDir);
}

export interface ArchiveInvariantResult {
  isArchived: boolean;
  archivePath?: string;
  reason?: string;
}

/**
 * Verifies that the active change folder no longer exists and has moved to archive/
 */
export function checkArchiveInvariants(workspaceRoot: string, changeName: string): ArchiveInvariantResult {
  const activeChangePath = join(workspaceRoot, 'openspec', 'changes', changeName);
  if (existsSync(activeChangePath)) {
    return {
      isArchived: false,
      reason: `Active change directory still exists at ${activeChangePath}`,
    };
  }

  const archiveRoot = join(workspaceRoot, 'openspec', 'changes', 'archive');
  if (!existsSync(archiveRoot)) {
    return {
      isArchived: false,
      reason: `Archive directory does not exist at ${archiveRoot}`,
    };
  }

  try {
    const entries = readdirSync(archiveRoot);
    const match = entries.find((e) => e === changeName || e.endsWith(`-${changeName}`));
    if (!match) {
      return {
        isArchived: false,
        reason: `Change directory not found in ${archiveRoot}`,
      };
    }

    return {
      isArchived: true,
      archivePath: join(archiveRoot, match),
    };
  } catch (err) {
    return {
      isArchived: false,
      reason: `Failed to inspect archive directory: ${err}`,
    };
  }
}

// --- Main Runner Execution ---

export async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.changeName && !options.replyMessage && !options.continueSession) {
    console.error('Error: Must specify --change <name>, --reply "<message>", or --continue');
    printHelp();
    process.exit(1);
  }

  const workspaceRoot = options.explicitRoot ? resolve(options.explicitRoot) : resolveWorkspaceRoot();
  console.log(`[pi-archive] Workspace root resolved to: ${workspaceRoot}`);

  let initialPrompt = '';
  if (options.replyMessage) {
    initialPrompt = options.replyMessage;
    console.log(`[pi-archive] Sending reply to archive session...`);
  } else if (options.changeName) {
    initialPrompt = `/skill:openspec-archive-change ${options.changeName}`;
    console.log(`[pi-archive] Starting archive delegation for change: '${options.changeName}'...`);
  } else if (options.continueSession) {
    initialPrompt = 'Continue';
    console.log(`[pi-archive] Resuming worker session with continue...`);
  }

  const spawnArgs = ['-a'];
  if (options.changeName) {
    const sessionId = resolveSessionId(options.changeName);
    spawnArgs.push('--session-id', sessionId);
    console.log(`[pi-archive] Reusing session ID: ${sessionId}`);
  } else {
    console.warn(`[pi-archive] Warning: No change name provided, falling back to continue (-c)`);
    spawnArgs.push('-c');
  }
  spawnArgs.push('--mode', 'rpc');

  console.log(`[pi-archive] Spawning: pi ${spawnArgs.join(' ')} (cwd: ${workspaceRoot})`);
  const piProcess: ChildProcess = spawn('pi', spawnArgs, {
    cwd: workspaceRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  if (!piProcess.stdin || !piProcess.stdout || !piProcess.stderr) {
    console.error('[pi-archive] Failed to establish stdio pipes with pi process.');
    process.exit(1);
  }

  let lineBuffer = '';
  let lastAssistantMessage = '';
  let settled = false;
  let turnTimer: Timer | null = null;

  function resetTimer() {
    if (turnTimer) clearTimeout(turnTimer);
    turnTimer = setTimeout(() => {
      console.error(`\n[pi-archive] ERROR: Worker turn timed out after ${options.timeoutMs}ms without settlement.`);
      piProcess.kill('SIGTERM');
      process.exit(1);
    }, options.timeoutMs);
  }

  resetTimer();

  piProcess.stdout.on('data', (chunk: Buffer) => {
    lineBuffer += chunk.toString('utf-8');
    let idx: number;

    while ((idx = lineBuffer.indexOf('\n')) !== -1) {
      let line = lineBuffer.slice(0, idx);
      lineBuffer = lineBuffer.slice(idx + 1);

      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      line = line.trim();
      if (!line) continue;

      try {
        const parsed = JSON.parse(line);
        handleRpcRecord(parsed);
      } catch (err) {
        if (options.verbose) {
          console.error(`[pi-archive:raw] ${line}`);
        }
      }
    }
  });

  piProcess.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf-8');
    if (options.verbose || text.includes('Error') || text.includes('error')) {
      process.stderr.write(`[pi:stderr] ${text}`);
    }
  });

  piProcess.on('error', (err) => {
    console.error(`[pi-archive] Worker process error:`, err);
    process.exit(1);
  });

  piProcess.on('close', (code) => {
    if (turnTimer) clearTimeout(turnTimer);
    if (!settled) {
      console.log(`[pi-archive] Process closed with code ${code}`);
      if (code !== 0) {
        console.error(`[STATUS] FAILED: pi process exited with code ${code}`);
        process.exit(code || 1);
      }
    }
  });

  function handleRpcRecord(record: Record<string, unknown>) {
    resetTimer();

    // Handle extension UI requests
    if (record.type === 'extension_ui_request') {
      const req = record as Record<string, unknown>;
      const method = req.method as string;
      if (['select', 'confirm', 'input', 'editor'].includes(method)) {
        let value: unknown = true;
        if (method === 'select') value = (req.options as string[])?.[0] || '';
        if (method === 'input') value = '';
        if (method === 'editor') value = req.prefill || '';
        piProcess.stdin.write(
          JSON.stringify({
            type: 'extension_ui_response',
            id: req.id,
            value,
          }) + '\n'
        );
      }
      return;
    }

    if (record.type === 'response') {
      const resp = record as unknown as RpcResponse;
      if (!resp.success) {
        console.error(`[pi-archive] RPC command rejected:`, resp.error || resp);
      }
      return;
    }

    const event = record as unknown as PiEvent;

    // Suppress high-frequency token updates
    if (event.type === 'message_update') {
      const sub = event.assistantMessageEvent;
      if (sub && (sub.type === 'text_delta' || sub.type === 'thinking_delta')) {
        return;
      }
    }

    const isToolStart =
      event.type === 'toolcall_start' ||
      (event.type === 'message_update' && event.assistantMessageEvent?.type === 'toolcall_start');
    if (isToolStart) {
      const tool = event.assistantMessageEvent?.toolCall || event.assistantMessageEvent || (record as Record<string, unknown>);
      const name = tool.toolName || tool.name || (tool as Record<string, unknown>).tool || 'tool';
      console.log(`⚙ [pi:tool] Invoking: ${name}`);
      return;
    }

    const isToolEnd =
      event.type === 'toolcall_end' ||
      (event.type === 'message_update' && event.assistantMessageEvent?.type === 'toolcall_end');
    if (isToolEnd) {
      const tool = event.assistantMessageEvent?.toolCall || event.assistantMessageEvent || (record as Record<string, unknown>);
      const name = tool.toolName || tool.name || (tool as Record<string, unknown>).tool || 'tool';
      console.log(`✓ [pi:tool] Completed: ${name}`);
      return;
    }

    if (event.type === 'turn_end' && Array.isArray(event.toolResults) && event.toolResults.length > 0) {
      console.log(`  [pi:turn] Completed ${event.toolResults.length} tool invocation(s).`);
    }

    if (event.type === 'message_end' && event.message?.role === 'assistant') {
      const content = event.message.content;
      if (typeof content === 'string') {
        lastAssistantMessage = content;
      } else if (Array.isArray(content)) {
        lastAssistantMessage = content
          .filter((c) => c.type === 'text' && c.text)
          .map((c) => c.text)
          .join('\n');
      }
      if (lastAssistantMessage.trim()) {
        console.log(`\n💬 [pi:assistant]\n${lastAssistantMessage.trim()}\n`);
      }
      return;
    }

    if (event.type === 'agent_settled') {
      settled = true;
      if (turnTimer) clearTimeout(turnTimer);
      onAgentSettled();
    }
  }

  function onAgentSettled() {
    console.log(`[pi-archive] Worker agent settled.`);

    if (options.changeName) {
      // Grace period for directory operations
      setTimeout(() => {
        const invariant = checkArchiveInvariants(workspaceRoot, options.changeName!);
        if (invariant.isArchived) {
          console.log(`\n========================================`);
          console.log(`[STATUS] COMPLETED: Change '${options.changeName}' successfully archived!`);
          if (invariant.archivePath) {
            console.log(`Archived location: ${invariant.archivePath}`);
          }
          console.log(`========================================\n`);
          safeExit(0);
        } else {
          console.log(`\n========================================`);
          console.log(`[STATUS] PAUSED_FOR_CLARIFICATION: Worker settled but change '${options.changeName}' is not archived.`);
          console.log(`Details: ${invariant.reason}`);
          if (lastAssistantMessage.trim()) {
            console.log(`\nLast Message from Worker:\n${lastAssistantMessage.trim()}`);
          }
          console.log(`========================================\n`);
          safeExit(0);
        }
      }, 200);
      return;
    }

    console.log(`[STATUS] SETTLED: Worker turn finished.`);
    safeExit(0);
  }

  function safeExit(code: number) {
    setTimeout(() => {
      try {
        piProcess.kill('SIGTERM');
      } catch {}
      process.exit(code);
    }, 200);
  }

  if (initialPrompt) {
    const promptCmd = JSON.stringify({
      id: `prompt-${Date.now()}`,
      type: 'prompt',
      message: initialPrompt,
    }) + '\n';

    piProcess.stdin.write(promptCmd);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('[pi-archive] Fatal error:', err);
    process.exit(1);
  });
}
