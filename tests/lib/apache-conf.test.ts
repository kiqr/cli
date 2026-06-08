import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {writeApacheConf} from '../../src/lib/apache-conf.js';

describe('writeApacheConf', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-apache-conf-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('writes the conf file and returns its path', () => {
    const file = writeApacheConf(tmp);
    expect(file).toBe(path.join(tmp, 'kiqr-apache.conf'));
    expect(fs.existsSync(file)).toBe(true);
  });

  it('creates the runtime directory if it does not exist', () => {
    const nested = path.join(tmp, 'a', 'b');
    const file = writeApacheConf(nested);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('sets HTTPS=on from X-Forwarded-Proto so non-WP PHP scripts see is_ssl', () => {
    const content = fs.readFileSync(writeApacheConf(tmp), 'utf-8');
    expect(content).toContain('SetEnvIfNoCase X-Forwarded-Proto https HTTPS=on');
  });

  it('pre-empts mod_dir DirectorySlash with a forwarded-host-aware 301', () => {
    // Without this rewrite, mod_dir 301s `/wp-admin` to
    // http://<local-Host>/wp-admin/ -- which behind cloudflared is a dead URL.
    const content = fs.readFileSync(writeApacheConf(tmp), 'utf-8');
    // Runs BEFORE the WP .htaccess via InheritDownBefore.
    expect(content).toContain('RewriteOptions InheritDownBefore');
    // Only fires on directory-without-trailing-slash requests.
    expect(content).toContain('REQUEST_FILENAME} -d');
    expect(content).toContain('REQUEST_URI} !/$');
    // Only fires when forwarded as https (so local browsing keeps Apache's
    // default Port-preserving behavior).
    expect(content).toContain('X-Forwarded-Proto} =https');
    // Builds the redirect from X-Forwarded-Host, not Apache's view of Host.
    expect(content).toContain('X-Forwarded-Host} ^([^,]+)$');
    expect(content).toContain('https://%1/$1/');
    expect(content).toContain('[R=301');
  });

  it('is deterministic across writes', () => {
    const a = fs.readFileSync(writeApacheConf(tmp), 'utf-8');
    const b = fs.readFileSync(writeApacheConf(tmp), 'utf-8');
    expect(a).toBe(b);
  });
});
