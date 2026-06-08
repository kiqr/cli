import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  buildXdebugDockerfile,
  removeXdebugAssets,
  writeXdebugAssets,
  XDEBUG_CLIENT_PORT,
  XDEBUG_DOCKERFILE,
  XDEBUG_INI,
  xdebugIni,
} from '../../src/lib/xdebug.js';

describe('xdebugIni', () => {
  it('enables debug mode with start_with_request', () => {
    const ini = xdebugIni();
    expect(ini).toContain('zend_extension=xdebug');
    expect(ini).toContain('xdebug.mode=debug');
    expect(ini).toContain('xdebug.start_with_request=yes');
  });

  it('points the client at the host on the standard DBGp port', () => {
    const ini = xdebugIni();
    expect(ini).toContain('xdebug.client_host=host.docker.internal');
    expect(ini).toContain(`xdebug.client_port=${XDEBUG_CLIENT_PORT}`);
    expect(XDEBUG_CLIENT_PORT).toBe(9003);
    expect(ini).toContain('xdebug.discover_client_host=true');
  });
});

describe('buildXdebugDockerfile', () => {
  it('layers Xdebug onto the given base image', () => {
    const dockerfile = buildXdebugDockerfile('wordpress:php8.3');
    expect(dockerfile).toContain('FROM wordpress:php8.3');
    expect(dockerfile).toContain('pecl install xdebug');
    expect(dockerfile).toContain('docker-php-ext-enable xdebug');
  });

  it('copies the ini into the PHP conf.d directory', () => {
    const dockerfile = buildXdebugDockerfile('wordpress:php8.4');
    expect(dockerfile).toContain(
      `COPY ${XDEBUG_INI} /usr/local/etc/php/conf.d/zz-xdebug.ini`,
    );
  });

  it('uses whatever base image it is given', () => {
    expect(buildXdebugDockerfile('wordpress:6.7-php8.2')).toContain(
      'FROM wordpress:6.7-php8.2',
    );
  });
});

describe('writeXdebugAssets / removeXdebugAssets', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-xdebug-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('writes both the Dockerfile and ini into the runtime dir', () => {
    const dockerfilePath = writeXdebugAssets(tmpDir, 'wordpress:php8.3');

    expect(dockerfilePath).toBe(path.join(tmpDir, XDEBUG_DOCKERFILE));
    expect(fs.existsSync(path.join(tmpDir, XDEBUG_DOCKERFILE))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, XDEBUG_INI))).toBe(true);

    const dockerfile = fs.readFileSync(path.join(tmpDir, XDEBUG_DOCKERFILE), 'utf-8');
    const ini = fs.readFileSync(path.join(tmpDir, XDEBUG_INI), 'utf-8');
    expect(dockerfile).toBe(buildXdebugDockerfile('wordpress:php8.3'));
    expect(ini).toBe(xdebugIni());
  });

  it('creates the runtime dir if it does not exist', () => {
    const nested = path.join(tmpDir, 'nested', 'runtime');
    writeXdebugAssets(nested, 'wordpress:php8.3');
    expect(fs.existsSync(path.join(nested, XDEBUG_DOCKERFILE))).toBe(true);
  });

  it('removes the generated assets', () => {
    writeXdebugAssets(tmpDir, 'wordpress:php8.3');
    removeXdebugAssets(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, XDEBUG_DOCKERFILE))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, XDEBUG_INI))).toBe(false);
  });

  it('is a no-op when removing assets that do not exist', () => {
    expect(() => removeXdebugAssets(tmpDir)).not.toThrow();
  });
});
