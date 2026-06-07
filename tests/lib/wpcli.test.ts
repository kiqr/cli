import {describe, expect, it} from 'vitest';
import {buildWpCliArgs} from '../../src/lib/wpcli.js';

describe('buildWpCliArgs', () => {
  it('produces a docker compose run invocation with --profile cli and -T to disable TTY', () => {
    const args = buildWpCliArgs('/path/compose.yaml', ['wp', 'db', 'export', '-']);
    expect(args).toEqual([
      'compose',
      '-f',
      '/path/compose.yaml',
      '--profile',
      'cli',
      'run',
      '--rm',
      '-T',
      'wpcli',
      'wp',
      'db',
      'export',
      '-',
    ]);
  });

  it('enables the cli profile so the profiled wpcli service can start', () => {
    const args = buildWpCliArgs('/path/compose.yaml', ['wp', 'core', 'is-installed']);
    const profileIdx = args.indexOf('--profile');
    expect(profileIdx).toBeGreaterThanOrEqual(0);
    expect(args[profileIdx + 1]).toBe('cli');
    // --profile must come before the `run` subcommand to take effect.
    expect(profileIdx).toBeLessThan(args.indexOf('run'));
  });

  it('passes WP-CLI args verbatim as separate array elements (no shell joining)', () => {
    const args = buildWpCliArgs('/path/compose.yaml', [
      'wp',
      'post',
      'create',
      '--post_title=Hello World',
    ]);
    expect(args).toContain('--post_title=Hello World');
  });
});
