import fs from 'node:fs';
import {isDockerInstalled, isDockerRunning} from './docker.js';
import {isPortAvailable} from './ports.js';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

/** Traefik web entrypoint (see src/lib/traefik.ts). */
export const TRAEFIK_PORT = 5477;
/** LiveReload SSE server (see src/lib/livereload.ts). */
export const LIVERELOAD_PORT = 35729;

/**
 * Returns true when running under the Windows Subsystem for Linux.
 * WSL kernels include "microsoft" in /proc/version.
 */
export function isWSL(): boolean {
  try {
    const version = fs.readFileSync('/proc/version', 'utf-8').toLowerCase();
    return version.includes('microsoft') || version.includes('wsl');
  } catch {
    return false;
  }
}

/**
 * Runs cheap, read-only environment preflight checks and reports the
 * result of each. Pure aside from reading the environment (Docker CLI,
 * /proc/version, local sockets) — does not start or mutate anything.
 */
export async function runDoctorChecks(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const dockerInstalled = isDockerInstalled();
  checks.push({
    name: 'Docker installed',
    ok: dockerInstalled,
    detail: dockerInstalled
      ? 'docker CLI found'
      : 'docker CLI not found — install Docker Desktop or the Docker engine',
  });

  // Only probe the daemon if the CLI exists; `docker info` is meaningless
  // (and slow to fail) without it.
  if (dockerInstalled) {
    const dockerRunning = isDockerRunning();
    checks.push({
      name: 'Docker running',
      ok: dockerRunning,
      detail: dockerRunning
        ? 'docker daemon is responding'
        : 'docker daemon is not responding — start Docker and try again',
    });
  } else {
    checks.push({
      name: 'Docker running',
      ok: false,
      detail: 'skipped — Docker is not installed',
    });
  }

  const traefikFree = await isPortAvailable(TRAEFIK_PORT);
  checks.push({
    name: `Traefik port ${TRAEFIK_PORT} available`,
    ok: traefikFree,
    detail: traefikFree
      ? 'port is free'
      : `port ${TRAEFIK_PORT} is in use — stop the process using it before "kiqr up"`,
  });

  const livereloadFree = await isPortAvailable(LIVERELOAD_PORT);
  checks.push({
    name: `LiveReload port ${LIVERELOAD_PORT} available`,
    ok: livereloadFree,
    detail: livereloadFree
      ? 'port is free'
      : `port ${LIVERELOAD_PORT} is in use — "kiqr watch" reload may not work`,
  });

  const wsl = isWSL();
  checks.push({
    name: 'Platform',
    ok: true,
    detail: wsl ? 'WSL detected — use the Docker Desktop WSL integration' : 'native',
  });

  return checks;
}
