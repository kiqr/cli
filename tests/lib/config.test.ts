import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  readProjectConfig,
  writeProjectConfig,
  readLocalConfig,
  writeLocalConfig,
  projectConfigExists,
} from '../../src/lib/config.js';
import type {ProjectConfig, LocalConfig} from '../../src/types/config.js';

describe('project config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('writes and reads kiqr.yaml', () => {
    const config: ProjectConfig = {
      project_id: 'test-uuid',
      name: 'my-theme',
      wordpress: {version: 'latest', php_version: '8.3'},
      development: {dynamic_urls: true},
    };

    writeProjectConfig(config, tmpDir);
    expect(projectConfigExists(tmpDir)).toBe(true);

    const loaded = readProjectConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  it('returns null when kiqr.yaml does not exist', () => {
    expect(readProjectConfig(tmpDir)).toBeNull();
  });
});

describe('local config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-local-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('writes and reads local config', () => {
    const config: LocalConfig = {
      project_id: 'test-uuid',
      runtime: 'bitnami',
      db_password: 'testpassword123456789012',
      login_secret: 'testsecret1234567890',
      created_at: '2026-05-29T00:00:00Z',
    };

    writeLocalConfig(config, tmpDir);

    const loaded = readLocalConfig(tmpDir);
    expect(loaded).toEqual(config);
  });
});
