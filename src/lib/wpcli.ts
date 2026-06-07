import {type ChildProcessByStdio, spawn, spawnSync} from 'node:child_process';
import type {Readable, Writable} from 'node:stream';

export function buildWpCliArgs(composePath: string, wpArgs: string[]): string[] {
  return [
    'compose',
    '-f',
    composePath,
    '--profile',
    'cli',
    'run',
    '--rm',
    '-T',
    'wpcli',
    ...wpArgs,
  ];
}

export type WpCliProcess = ChildProcessByStdio<Writable, Readable, Readable>;

export function spawnWpCli(composePath: string, wpArgs: string[]): WpCliProcess {
  return spawn('docker', buildWpCliArgs(composePath, wpArgs), {
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as WpCliProcess;
}

/**
 * Run WP-CLI with the parent process's stdio inherited so output streams
 * straight to the terminal. Uses spawnSync with an args array (no shell), so
 * arguments containing spaces, quotes, or other special characters are passed
 * through verbatim. Returns the child's exit code (or 1 if it was signalled).
 */
export function runWpCliInherit(composePath: string, wpArgs: string[]): number {
  const result = spawnSync('docker', buildWpCliArgs(composePath, wpArgs), {
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

export function isWordPressInstalled(composePath: string): boolean {
  const result = spawnSync(
    'docker',
    buildWpCliArgs(composePath, ['wp', 'core', 'is-installed']),
    {
      stdio: 'pipe',
    },
  );
  return result.status === 0;
}
