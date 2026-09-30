#!/usr/bin/env bun
/**
 * scripts/pi-rpc-apply.ts
 *
 * Bridge runner driving `pi -a -c --mode rpc` over stdio duplex to execute
 * the `openspec-apply-change` workflow on a specified change.
 *
 * Responsibilities:
 * - Deterministically resolves workspace root (nearest Git / OpenSpec root ancestor)
 * - Spawns `pi -a -c --mode rpc` with cwd set to workspace root
 * - Streams and strictly decodes JSONL on LF (\n) boundaries
 * - Suppresses high-frequency token deltas to prevent log flooding & pipe stalls
 * - Formats and displays clean tool calls and assistant progress
 * - Detects `agent_settled` turn completion
 * - Validates change completion against `openspec status --change <name> --json`
 * - Emits structured status (COMPLETED, PAUSED_FOR_CLARIFICATION, FAILED)
 * - Supports session continuation via `--reply "<answer>"`
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
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

// --- CLI Arguments & Workspace Resolution ---

interface CliOptions {
  changeName?: string;
  replyMessage?: string;
  continueSession: boolean;
  timeoutMs: number;
  explicitRoot?: string;
  verbose: boolean;
}

function printHelp(): void {
  console.log(`
Usage: bun run scripts/pi-rpc-apply.ts [options]

Options:
  --change <name>        OpenSpec change name to apply
  --reply "<message>"    Send a reply/clarification to the active pi worker session
  --continue             Continue existing pi session without new prompt
  --timeout <ms>         Turn timeout in milliseconds (default: 300000ms / 5 min)
  --root <path>          Explicit workspace root directory
  --verbose              Print detailed event diagnostics to stderr
  -h, --help             Show this help message
`);
}

function parseArgs(args: string[]): CliOptions {
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

// --- Main Runner Execution ---

export async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.changeName && !options.replyMessage && !options.continueSession) {
    console.error('Error: Must specify --change <name>, --reply "<message>", or --continue');
    printHelp();
    process.exit(1);
  }

  const workspaceRoot = options.explicitRoot ? resolve(options.explicitRoot) : resolveWorkspaceRoot();
  console.log(`[pi-runner] Workspace root resolved to: ${workspaceRoot}`);

  // Construct initial prompt
  let initialPrompt = '';
  if (options.replyMessage) {
    initialPrompt = options.replyMessage;
    console.log(`[pi-runner] Sending clarification reply to worker session...`);
  } else if (options.changeName) {
    initialPrompt = `/skill:openspec-apply-change ${options.changeName}`;
    console.log(`[pi-runner] Starting apply for change: '${options.changeName}'...`);
  } else if (options.continueSession) {
    initialPrompt = 'Continue';
    console.log(`[pi-runner] Resuming worker session with continue...`);
  }

  // Construct pi spawn arguments with change-scoped session isolation
  const spawnArgs = ['-a'];
  if (options.changeName) {
    const sessionId = resolveSessionId(options.changeName);
    spawnArgs.push('--session-id', sessionId);
    console.log(`[pi-runner] Change session ID: ${sessionId}`);
  } else {
    console.warn(`[pi-runner] Warning: No change name provided, falling back to continue (-c)`);
    spawnArgs.push('-c');
  }
  spawnArgs.push('--mode', 'rpc');

  console.log(`[pi-runner] Spawning: pi ${spawnArgs.join(' ')} (cwd: ${workspaceRoot})`);
  const piProcess: ChildProcess = spawn('pi', spawnArgs, {
    cwd: workspaceRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  if (!piProcess.stdin || !piProcess.stdout || !piProcess.stderr) {
    console.error('[pi-runner] Failed to establish stdio pipes with pi process.');
    process.exit(1);
  }

  let lineBuffer = '';
  let lastAssistantMessage = '';
  let settled = false;
  let turnTimer: Timer | null = null;

  function resetTimer() {
    if (turnTimer) clearTimeout(turnTimer);
    turnTimer = setTimeout(() => {
      console.error(`\n[pi-runner] ERROR: Worker turn timed out after ${options.timeoutMs}ms without settlement.`);
      piProcess.kill('SIGTERM');
      process.exit(1);
    }, options.timeoutMs);
  }

  resetTimer();

  // Strict LF (\n) stream parser (per references/pi/packages/coding-agent/docs/json.md)
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
          console.error(`[pi-runner:raw] ${line}`);
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
    console.error(`[pi-runner] Worker process error:`, err);
    process.exit(1);
  });

  piProcess.on('close', (code) => {
    if (turnTimer) clearTimeout(turnTimer);
    if (!settled) {
      console.log(`[pi-runner] Process closed with code ${code}`);
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

    // Check responses
    if (record.type === 'response') {
      const resp = record as unknown as RpcResponse;
      if (!resp.success) {
        console.error(`[pi-runner] RPC command rejected:`, resp.error || resp);
      }
      return;
    }

    const event = record as unknown as PiEvent;

    // Filter noisy token deltas (message_update with text_delta / thinking_delta)
    if (event.type === 'message_update') {
      const sub = event.assistantMessageEvent;
      if (sub && (sub.type === 'text_delta' || sub.type === 'thinking_delta')) {
        return; // Suppress high-frequency token updates
      }
    }

    // High-level tool execution events (nested or top-level)
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

    // Capture assistant messages on message_end
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

    // Handle settlement
    if (event.type === 'agent_settled') {
      settled = true;
      if (turnTimer) clearTimeout(turnTimer);
      onAgentSettled();
    }
  }

  function onAgentSettled() {
    console.log(`[pi-runner] Worker agent settled.`);

    // If changeName is known, check OpenSpec task implementation progress
    if (options.changeName) {
      try {
        const proc = Bun.spawnSync(
          ['openspec', 'instructions', 'apply', '--change', options.changeName, '--json'],
          { cwd: workspaceRoot }
        );
        const stdout = proc.stdout.toString();
        const applyJson = JSON.parse(stdout);

        const total = applyJson.progress?.total ?? 0;
        const complete = applyJson.progress?.complete ?? 0;
        const remaining = applyJson.progress?.remaining ?? 0;

        if (total > 0 && remaining === 0) {
          console.log(`\n========================================`);
          console.log(`[STATUS] COMPLETED: All ${complete}/${total} tasks for '${options.changeName}' are complete!`);
          console.log(`========================================\n`);
          safeExit(0);
          return;
        } else {
          console.log(`\n========================================`);
          console.log(`[STATUS] PAUSED_FOR_CLARIFICATION: Worker settled with ${remaining}/${total} remaining task(s).`);
          if (Array.isArray(applyJson.tasks)) {
            const pendingTasks = applyJson.tasks.filter((t: { done: boolean }) => !t.done);
            console.log(`Pending Tasks (${pendingTasks.length}):`);
            for (const t of pendingTasks.slice(0, 5)) {
              console.log(`  - [ ] ${t.description}`);
            }
            if (pendingTasks.length > 5) {
              console.log(`  ... and ${pendingTasks.length - 5} more.`);
            }
          }
          if (lastAssistantMessage.trim()) {
            console.log(`\nLast Message from Worker:\n${lastAssistantMessage.trim()}`);
          }
          console.log(`========================================\n`);
          safeExit(0);
          return;
        }
      } catch (err) {
        console.warn(`[pi-runner] Could not read openspec apply instructions JSON:`, err);
      }
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

  // Send initial prompt if provided
  if (initialPrompt) {
    const promptCmd = JSON.stringify({
      id: `prompt-${Date.now()}`,
      type: 'prompt',
      message: initialPrompt,
    }) + '\n';

    piProcess.stdin.write(promptCmd);
  }
}

// Run if invoked directly
if (import.meta.main) {
  main().catch((err) => {
    console.error('[pi-runner] Fatal error:', err);
    process.exit(1);
  });
}
