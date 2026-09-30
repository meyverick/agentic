import { describe, expect, it } from 'bun:test';
import { resolveSessionId } from './pi-rpc-apply.ts';

describe('resolveSessionId', () => {
  it('formats standard change names cleanly', () => {
    expect(resolveSessionId('add-user-auth')).toBe('openspec-add-user-auth');
    expect(resolveSessionId('fix_bug_123')).toBe('openspec-fix_bug_123');
    expect(resolveSessionId('v1.0.0-release')).toBe('openspec-v1.0.0-release');
  });

  it('strips leading and trailing non-alphanumeric characters', () => {
    expect(resolveSessionId('---leading-trailing---')).toBe('openspec-leading-trailing');
    expect(resolveSessionId('...dots...')).toBe('openspec-dots');
    expect(resolveSessionId('___underscores___')).toBe('openspec-underscores');
  });

  it('sanitizes unsupported special characters with hyphens', () => {
    expect(resolveSessionId('feat/auth@scope#1')).toBe('openspec-feat-auth-scope-1');
    expect(resolveSessionId('change with spaces')).toBe('openspec-change-with-spaces');
    expect(resolveSessionId('feature (beta) [v2]')).toBe('openspec-feature--beta---v2');
  });

  it('falls back to default safe name if input is completely empty or stripped', () => {
    expect(resolveSessionId('')).toBe('openspec-task');
    expect(resolveSessionId('   ')).toBe('openspec-task');
    expect(resolveSessionId('!@#$%^&*()')).toBe('openspec-task');
  });
});
