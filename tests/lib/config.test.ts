import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  projectConfigExists,
  readLocalConfig,
  readProjectConfig,
  writeLocalConfig,
  writeProjectConfig,
} from '../../src/lib/config.js';
import type {LocalConfig, ProjectConfig} from '../../src/types/config.js';

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

  it('throws a clear error when a required field is missing', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'kiqr.yaml'),
      'project_id: abc\nwordpress:\n  version: latest\n  php_version: "8.3"\ndevelopment:\n  dynamic_urls: true\n',
      'utf-8',
    );
    expect(() => readProjectConfig(tmpDir)).toThrow(/kiqr\.yaml is invalid/);
    expect(() => readProjectConfig(tmpDir)).toThrow(/name/);
  });

  it('throws a clear error when a field has the wrong type', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'kiqr.yaml'),
      'project_id: abc\nname: my-theme\nwordpress:\n  version: latest\n  php_version: "8.3"\ndevelopment:\n  dynamic_urls: "yes"\n',
      'utf-8',
    );
    expect(() => readProjectConfig(tmpDir)).toThrow(/development\.dynamic_urls/);
  });

  it('throws a clear error when the YAML is malformed', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'kiqr.yaml'),
      'name: my-theme\n  : : broken\n\t bad indent',
      'utf-8',
    );
    expect(() => readProjectConfig(tmpDir)).toThrow(/kiqr\.yaml is not valid YAML/);
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

  it('returns null when config.yaml does not exist', () => {
    expect(readLocalConfig(tmpDir)).toBeNull();
  });

  it('throws a clear error when a required field is missing', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'config.yaml'),
      'project_id: test-uuid\nruntime: bitnami\n',
      'utf-8',
    );
    expect(() => readLocalConfig(tmpDir)).toThrow(/config\.yaml is invalid/);
    expect(() => readLocalConfig(tmpDir)).toThrow(/db_password/);
  });

  it('treats xdebug as optional (backward compatible) and defaults to absent', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'config.yaml'),
      'project_id: test-uuid\n' +
        'runtime: bitnami\n' +
        'db_password: testpassword123456789012\n' +
        'login_secret: testsecret1234567890\n' +
        'created_at: 2026-05-29T00:00:00Z\n',
      'utf-8',
    );
    const loaded = readLocalConfig(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded?.xdebug).toBeUndefined();
  });

  it('round-trips the xdebug flag when set', () => {
    const config: LocalConfig = {
      project_id: 'test-uuid',
      runtime: 'bitnami',
      db_password: 'testpassword123456789012',
      login_secret: 'testsecret1234567890',
      xdebug: true,
      created_at: '2026-05-29T00:00:00Z',
    };
    writeLocalConfig(config, tmpDir);
    expect(readLocalConfig(tmpDir)?.xdebug).toBe(true);
  });

  it('rejects a non-boolean xdebug value', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'config.yaml'),
      'project_id: test-uuid\n' +
        'runtime: bitnami\n' +
        'db_password: testpassword123456789012\n' +
        'login_secret: testsecret1234567890\n' +
        'xdebug: maybe\n' +
        'created_at: 2026-05-29T00:00:00Z\n',
      'utf-8',
    );
    expect(() => readLocalConfig(tmpDir)).toThrow(/config\.yaml is invalid/);
    expect(() => readLocalConfig(tmpDir)).toThrow(/xdebug/);
  });
});
