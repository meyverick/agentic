import { describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseArgs,
  resolveSessionId,
  checkArchiveInvariants,
} from './pi-rpc-archive.ts';

describe('resolveSessionId', () => {
  it('formats standard change names cleanly', () => {
    expect(resolveSessionId('add-user-auth')).toBe('openspec-add-user-auth');
    expect(resolveSessionId('pi-apply-scoped-session')).toBe('openspec-pi-apply-scoped-session');
  });

  it('strips leading and trailing non-alphanumeric characters', () => {
    expect(resolveSessionId('---weird-name---')).toBe('openspec-weird-name');
    expect(resolveSessionId('...dotted.name...')).toBe('openspec-dotted.name');
  });

  it('sanitizes unsupported special characters with hyphens', () => {
    expect(resolveSessionId('feature/sub:part@v1')).toBe('openspec-feature-sub-part-v1');
    expect(resolveSessionId('hello world! (test)')).toBe('openspec-hello-world---test');
  });

  it('falls back to default safe name if input is completely empty or stripped', () => {
    expect(resolveSessionId('')).toBe('openspec-task');
    expect(resolveSessionId('---')).toBe('openspec-task');
  });

  it('appends unique timestamp suffix when fresh is enabled', () => {
    const id1 = resolveSessionId('my-change', true);
    const id2 = resolveSessionId('my-change', false);

    expect(id2).toBe('openspec-my-change');
    expect(id1.startsWith('openspec-my-change-')).toBe(true);
    expect(id1.length).toBeGreaterThan(id2.length);
  });
});

describe('parseArgs', () => {
  it('parses flags and positional arguments', () => {
    const opts = parseArgs([
      '--change',
      'test-change',
      '--fresh',
      '--verbose',
      '--timeout',
      '60000',
    ]);
    expect(opts.changeName).toBe('test-change');
    expect(opts.fresh).toBe(true);
    expect(opts.verbose).toBe(true);
    expect(opts.timeoutMs).toBe(60000);
  });

  it('parses reply message', () => {
    const opts = parseArgs(['--reply', 'Sync now']);
    expect(opts.replyMessage).toBe('Sync now');
  });
});

describe('checkArchiveInvariants', () => {
  it('detects incomplete archive when active folder still exists', () => {
    const testDir = join(tmpdir(), `test-inv-${Date.now()}`);
    mkdirSync(join(testDir, 'openspec', 'changes', 'my-change'), { recursive: true });

    const res = checkArchiveInvariants(testDir, 'my-change');
    expect(res.isArchived).toBe(false);
    expect(res.reason?.includes('Active change directory still exists')).toBe(true);

    rmSync(testDir, { recursive: true, force: true });
  });

  it('detects successful archive when active folder is removed and archive folder exists', () => {
    const testDir = join(tmpdir(), `test-inv-${Date.now()}`);
    mkdirSync(join(testDir, 'openspec', 'changes', 'archive', '2026-09-30-my-change'), {
      recursive: true,
    });

    const res = checkArchiveInvariants(testDir, 'my-change');
    expect(res.isArchived).toBe(true);
    expect(res.archivePath?.endsWith('2026-09-30-my-change')).toBe(true);

    rmSync(testDir, { recursive: true, force: true });
  });
});
