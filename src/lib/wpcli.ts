import {type ChildProcessByStdio, spawn, spawnSync} from 'node:child_process';
import type {Readable, Writable} from 'node:stream';

export function buildWpCliArgs(composePath: string, wpArgs: string[]): string[] {
  return ['compose', '-f', composePath, 'run', '--rm', '-T', 'wpcli', ...wpArgs];
}

export type WpCliProcess = ChildProcessByStdio<Writable, Readable, Readable>;

export function spawnWpCli(composePath: string, wpArgs: string[]): WpCliProcess {
  return spawn('docker', buildWpCliArgs(composePath, wpArgs), {
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as WpCliProcess;
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
