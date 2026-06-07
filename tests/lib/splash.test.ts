import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeSplashPage} from '../../src/lib/splash.js';

describe('writeSplashPage', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-splash-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('writes splash.html and returns its path', () => {
    const filePath = writeSplashPage(tmp);
    expect(filePath).toBe(path.join(tmp, 'splash.html'));
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('creates the target directory if it does not exist', () => {
    const nested = path.join(tmp, 'traefik', 'dynamic');
    const filePath = writeSplashPage(nested);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('produces a well-formed HTML document', () => {
    const content = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    expect(content.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(content).toContain('<html lang="en">');
    expect(content.trimEnd().endsWith('</html>')).toBe(true);
    expect(content).toContain('<title>Kiqr</title>');
  });

  it('shows the no-site-running message and brand marker', () => {
    const content = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    expect(content).toContain('No site is running at this address');
    expect(content).toContain('<div class="logo">Kiqr</div>');
  });

  it('instructs the user how to start a site and view help', () => {
    const content = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    expect(content).toContain('<code>kiqr up</code>');
    expect(content).toContain('<code>kiqr --help</code>');
  });

  it('renders the requested hostname client-side', () => {
    const content = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    expect(content).toContain('id="hostname"');
    expect(content).toContain("document.getElementById('hostname').textContent = location.host");
  });

  it('links back to the Kiqr project', () => {
    const content = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    expect(content).toContain('https://github.com/kiqr');
  });

  it('is deterministic across writes', () => {
    const first = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    const second = fs.readFileSync(writeSplashPage(tmp), 'utf-8');
    expect(first).toBe(second);
  });
});
