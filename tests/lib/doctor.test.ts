import fs from 'node:fs';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {isDockerInstalled, isDockerRunning} from '../../src/lib/docker.js';
import {
  isWSL,
  LIVERELOAD_PORT,
  runDoctorChecks,
  TRAEFIK_PORT,
} from '../../src/lib/doctor.js';
import {isPortAvailable} from '../../src/lib/ports.js';

vi.mock('../../src/lib/docker.js', () => ({
  isDockerInstalled: vi.fn(),
  isDockerRunning: vi.fn(),
}));

vi.mock('../../src/lib/ports.js', () => ({
  isPortAvailable: vi.fn(),
}));

const mockInstalled = vi.mocked(isDockerInstalled);
const mockRunning = vi.mocked(isDockerRunning);
const mockPort = vi.mocked(isPortAvailable);

function find(checks: Awaited<ReturnType<typeof runDoctorChecks>>, name: string) {
  const check = checks.find((c) => c.name === name);
  if (!check) throw new Error(`check not found: ${name}`);
  return check;
}

describe('runDoctorChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Healthy defaults; individual tests override.
    mockInstalled.mockReturnValue(true);
    mockRunning.mockReturnValue(true);
    mockPort.mockResolvedValue(true);
  });

  it('reports all green when the environment is healthy', async () => {
    const checks = await runDoctorChecks();
    expect(find(checks, 'Docker installed').ok).toBe(true);
    expect(find(checks, 'Docker running').ok).toBe(true);
    expect(find(checks, `Traefik port ${TRAEFIK_PORT} available`).ok).toBe(true);
    expect(find(checks, `LiveReload port ${LIVERELOAD_PORT} available`).ok).toBe(
      true,
    );
  });

  it('fails the Docker installed check when the CLI is missing', async () => {
    mockInstalled.mockReturnValue(false);
    const checks = await runDoctorChecks();
    expect(find(checks, 'Docker installed').ok).toBe(false);
    expect(find(checks, 'Docker installed').detail).toMatch(/not found/);
  });

  it('does not probe the daemon when Docker is not installed', async () => {
    mockInstalled.mockReturnValue(false);
    const checks = await runDoctorChecks();
    expect(mockRunning).not.toHaveBeenCalled();
    expect(find(checks, 'Docker running').ok).toBe(false);
    expect(find(checks, 'Docker running').detail).toMatch(/skipped/);
  });

  it('fails the Docker running check when the daemon is down', async () => {
    mockRunning.mockReturnValue(false);
    const checks = await runDoctorChecks();
    expect(find(checks, 'Docker running').ok).toBe(false);
    expect(find(checks, 'Docker running').detail).toMatch(/not responding/);
  });

  it('checks the Traefik and LiveReload ports', async () => {
    await runDoctorChecks();
    expect(mockPort).toHaveBeenCalledWith(TRAEFIK_PORT);
    expect(mockPort).toHaveBeenCalledWith(LIVERELOAD_PORT);
  });

  it('fails the port check when a port is in use', async () => {
    mockPort.mockImplementation(async (port: number) => port !== TRAEFIK_PORT);
    const checks = await runDoctorChecks();
    expect(find(checks, `Traefik port ${TRAEFIK_PORT} available`).ok).toBe(false);
    expect(find(checks, `LiveReload port ${LIVERELOAD_PORT} available`).ok).toBe(
      true,
    );
  });

  it('always reports the platform check as informational (ok)', async () => {
    const checks = await runDoctorChecks();
    expect(find(checks, 'Platform').ok).toBe(true);
  });
});

describe('isWSL', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when /proc/version mentions microsoft', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      'Linux version 5.15.0-microsoft-standard-WSL2',
    );
    expect(isWSL()).toBe(true);
  });

  it('returns false for a native kernel', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      'Linux version 6.0.0-generic',
    );
    expect(isWSL()).toBe(false);
  });

  it('returns false when /proc/version cannot be read', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(isWSL()).toBe(false);
  });
});
