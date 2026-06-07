import {describe, expect, it} from 'vitest';
import {
  COMPLETION_SHELLS,
  type CompletionShell,
  generateCompletion,
  isCompletionShell,
  KIQR_COMMANDS,
} from '../../src/lib/completion.js';

const COMMANDS = [...KIQR_COMMANDS];

describe('COMPLETION_SHELLS', () => {
  it('lists exactly bash, zsh, and fish', () => {
    expect(COMPLETION_SHELLS).toEqual(['bash', 'zsh', 'fish']);
  });
});

describe('KIQR_COMMANDS', () => {
  it('includes the stable top-level commands', () => {
    for (const cmd of [
      'up',
      'down',
      'restart',
      'init',
      'info',
      'open',
      'logs',
      'wp',
      'watch',
      'destroy',
      'doctor',
      'db',
    ]) {
      expect(KIQR_COMMANDS).toContain(cmd);
    }
  });
});

describe('isCompletionShell', () => {
  it('accepts supported shells', () => {
    for (const shell of COMPLETION_SHELLS) {
      expect(isCompletionShell(shell)).toBe(true);
    }
  });

  it('rejects unknown shells', () => {
    expect(isCompletionShell('powershell')).toBe(false);
    expect(isCompletionShell('')).toBe(false);
    expect(isCompletionShell('BASH')).toBe(false);
  });
});

describe('generateCompletion', () => {
  for (const shell of COMPLETION_SHELLS) {
    describe(shell, () => {
      const script = generateCompletion(shell, COMMANDS);

      it('returns a non-empty script', () => {
        expect(script.length).toBeGreaterThan(0);
        expect(script.trim()).not.toBe('');
      });

      it('contains every command name', () => {
        for (const cmd of COMMANDS) {
          expect(script).toContain(cmd);
        }
      });
    });
  }

  it('emits the bash-specific marker (complete -F)', () => {
    const script = generateCompletion('bash', COMMANDS);
    expect(script).toContain('complete -F');
    expect(script).toContain('_kiqr_completion');
    expect(script).toContain('compgen -W');
  });

  it('emits the zsh-specific marker (compdef)', () => {
    const script = generateCompletion('zsh', COMMANDS);
    expect(script).toContain('#compdef kiqr');
    expect(script).toContain('compdef _kiqr kiqr');
  });

  it('emits the fish-specific marker (complete -c)', () => {
    const script = generateCompletion('fish', COMMANDS);
    expect(script).toContain('complete -c kiqr');
    expect(script).toContain('__fish_use_subcommand');
  });

  it('reflects a custom command list rather than hardcoding', () => {
    const custom = ['alpha', 'beta'];
    const script = generateCompletion('bash', custom);
    expect(script).toContain('alpha');
    expect(script).toContain('beta');
    expect(script).not.toContain('destroy');
  });

  it('throws on an unsupported shell', () => {
    expect(() => generateCompletion('powershell' as CompletionShell, COMMANDS)).toThrow(
      /Unsupported shell/,
    );
  });
});
