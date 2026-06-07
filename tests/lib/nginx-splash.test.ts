import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeNginxSplashConf} from '../../src/lib/nginx-splash.js';

describe('writeNginxSplashConf', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-nginx-splash-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('writes splash-nginx.conf and returns its path', () => {
    const filePath = writeNginxSplashConf(tmp);
    expect(filePath).toBe(path.join(tmp, 'splash-nginx.conf'));
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('creates the target directory if it does not exist', () => {
    const nested = path.join(tmp, 'traefik', 'dynamic');
    const filePath = writeNginxSplashConf(nested);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('defines a catch-all server listening on port 80', () => {
    const content = fs.readFileSync(writeNginxSplashConf(tmp), 'utf-8');
    expect(content).toContain('server {');
    expect(content).toContain('listen 80;');
    expect(content).toContain('server_name _;');
  });

  it('serves the splash page from the nginx html root', () => {
    const content = fs.readFileSync(writeNginxSplashConf(tmp), 'utf-8');
    expect(content).toContain('location / {');
    expect(content).toContain('root /usr/share/nginx/html;');
    expect(content).toContain('try_files /splash.html =404;');
  });

  it('is deterministic across writes', () => {
    const first = fs.readFileSync(writeNginxSplashConf(tmp), 'utf-8');
    const second = fs.readFileSync(writeNginxSplashConf(tmp), 'utf-8');
    expect(first).toBe(second);
  });
});
