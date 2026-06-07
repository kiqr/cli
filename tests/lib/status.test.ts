import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {writeProjectConfig} from '../../src/lib/config.js';
import {
  containerNameFor,
  getProjectStatus,
  serviceFromContainerName,
} from '../../src/lib/status.js';
import type {ProjectConfig} from '../../src/types/config.js';

// buildProjectHostname embeds the machine hostname; pin it so URL assertions
// are deterministic regardless of the host the test runs on.
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {...actual, default: {...actual, hostname: () => 'testbox'}};
});

const PROJECT: ProjectConfig = {
  project_id: 'proj-123',
  name: 'acme',
  wordpress: {version: 'latest', php_version: '8.3'},
  development: {dynamic_urls: true},
};

describe('containerNameFor', () => {
  it('joins the project id and service name', () => {
    expect(containerNameFor('proj-123', 'wordpress')).toBe('proj-123-wordpress');
    expect(containerNameFor('proj-123', 'mariadb')).toBe('proj-123-mariadb');
    expect(containerNameFor('proj-123', 'phpmyadmin')).toBe('proj-123-phpmyadmin');
  });
});

describe('serviceFromContainerName', () => {
  it('recovers the service name even when the project id has hyphens', () => {
    expect(serviceFromContainerName('smoke-proj-wordpress')).toBe('wordpress');
    expect(serviceFromContainerName('proj-123-mariadb')).toBe('mariadb');
    expect(serviceFromContainerName('a-b-c-phpmyadmin')).toBe('phpmyadmin');
  });

  it('falls back to the full name when no known service matches', () => {
    expect(serviceFromContainerName('kiqr-traefik')).toBe('kiqr-traefik');
  });
});

describe('getProjectStatus', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-status-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('reports not initialized when there is no project config', () => {
    const isContainerRunning = vi.fn(() => true);
    const status = getProjectStatus({isContainerRunning, cwd: tmpDir});

    expect(status).toEqual({initialized: false, running: false, containers: []});
    // No point querying Docker for a project that does not exist.
    expect(isContainerRunning).not.toHaveBeenCalled();
  });

  it('reports running with URLs when the wordpress container is up', () => {
    writeProjectConfig(PROJECT, tmpDir);
    const isContainerRunning = vi.fn(() => true);

    const status = getProjectStatus({isContainerRunning, cwd: tmpDir});

    expect(status.initialized).toBe(true);
    expect(status.running).toBe(true);
    expect(status.containers).toEqual([
      {name: 'proj-123-wordpress', running: true},
      {name: 'proj-123-mariadb', running: true},
      {name: 'proj-123-phpmyadmin', running: true},
    ]);
    expect(status.urls).toEqual({
      site: 'http://acme.testbox.lvh.me:5477',
      admin: 'http://acme.testbox.lvh.me:5477/wp-admin',
      phpmyadmin: 'http://phpmyadmin.acme.testbox.lvh.me:5477',
    });
  });

  it('queries one container per service using the compose name prefix', () => {
    writeProjectConfig(PROJECT, tmpDir);
    const isContainerRunning = vi.fn(() => false);

    getProjectStatus({isContainerRunning, cwd: tmpDir});

    expect(isContainerRunning.mock.calls.map((c) => c[0])).toEqual([
      'proj-123-wordpress',
      'proj-123-mariadb',
      'proj-123-phpmyadmin',
    ]);
  });

  it('reports stopped and omits URLs when wordpress is down', () => {
    writeProjectConfig(PROJECT, tmpDir);
    const isContainerRunning = vi.fn(() => false);

    const status = getProjectStatus({isContainerRunning, cwd: tmpDir});

    expect(status.running).toBe(false);
    expect(status.urls).toBeUndefined();
    expect(status.containers.every((c) => !c.running)).toBe(true);
  });

  it('treats the site as stopped when only support services run', () => {
    writeProjectConfig(PROJECT, tmpDir);
    // mariadb + phpmyadmin up, wordpress down (a partial / stuck start).
    const isContainerRunning = vi.fn((name: string) => !name.endsWith('-wordpress'));

    const status = getProjectStatus({isContainerRunning, cwd: tmpDir});

    expect(status.running).toBe(false);
    expect(status.urls).toBeUndefined();
    expect(status.containers).toEqual([
      {name: 'proj-123-wordpress', running: false},
      {name: 'proj-123-mariadb', running: true},
      {name: 'proj-123-phpmyadmin', running: true},
    ]);
  });

  it('uses an injected readProjectConfig when provided', () => {
    const isContainerRunning = vi.fn(() => true);
    const readProjectConfig = vi.fn(() => PROJECT);

    const status = getProjectStatus({isContainerRunning, readProjectConfig});

    expect(readProjectConfig).toHaveBeenCalled();
    expect(status.initialized).toBe(true);
    expect(status.running).toBe(true);
  });
});
