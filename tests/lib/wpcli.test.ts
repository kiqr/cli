import {describe, it, expect} from 'vitest';
import {buildWpCliArgs} from '../../src/lib/wpcli.js';

describe('buildWpCliArgs', () => {
  it('produces a docker compose run invocation with -T to disable TTY', () => {
    const args = buildWpCliArgs('/path/compose.yaml', ['wp', 'db', 'export', '-']);
    expect(args).toEqual([
      'compose',
      '-f',
      '/path/compose.yaml',
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
});
