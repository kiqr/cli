import {describe, expect, it} from 'vitest';
import {AGENT_PORT} from '../../src/lib/agent.js';
import {
  buildCloudflaredArgs,
  cloudflaredInstallHint,
  isCloudflaredInstalled,
  parseTunnelUrl,
  TRAEFIK_BASE_URL,
} from '../../src/lib/share.js';

describe('TRAEFIK_BASE_URL', () => {
  it('points at the local agent port', () => {
    expect(TRAEFIK_BASE_URL).toBe(`http://localhost:${AGENT_PORT}`);
  });
});

describe('buildCloudflaredArgs', () => {
  it('builds a quick-tunnel arg vector with the forced host header', () => {
    const args = buildCloudflaredArgs('http://localhost:5477', 'my-theme.host.lvh.me');
    expect(args).toEqual([
      'tunnel',
      '--no-autoupdate',
      '--url',
      'http://localhost:5477',
      '--http-host-header',
      'my-theme.host.lvh.me',
    ]);
  });
});

describe('parseTunnelUrl', () => {
  it('extracts the URL from a clean line', () => {
    const url = parseTunnelUrl('https://random-words-1234.trycloudflare.com');
    expect(url).toBe('https://random-words-1234.trycloudflare.com');
  });

  it('extracts the URL from a line with box-drawing and surrounding text', () => {
    const line = '2024-01-01 | INF |  |  https://big-blue-cat-42.trycloudflare.com   | ';
    expect(parseTunnelUrl(line)).toBe('https://big-blue-cat-42.trycloudflare.com');
  });

  it('extracts the URL from a line with ANSI color codes', () => {
    const line = '[32mINF[0m https://shy-fox-99.trycloudflare.com';
    expect(parseTunnelUrl(line)).toBe('https://shy-fox-99.trycloudflare.com');
  });

  it('returns null for a line with no tunnel URL', () => {
    expect(parseTunnelUrl('Requesting new quick Tunnel on trycloudflare.com...')).toBe(
      null,
    );
    expect(parseTunnelUrl('')).toBe(null);
  });

  it('does not match a plain http (non-https) trycloudflare URL', () => {
    expect(parseTunnelUrl('http://insecure.trycloudflare.com')).toBe(null);
  });
});

describe('isCloudflaredInstalled', () => {
  it('returns true when the version command succeeds', () => {
    const exec = () => {};
    expect(isCloudflaredInstalled(exec)).toBe(true);
  });

  it('returns false when the version command throws', () => {
    const exec = () => {
      throw new Error('command not found: cloudflared');
    };
    expect(isCloudflaredInstalled(exec)).toBe(false);
  });
});

describe('cloudflaredInstallHint', () => {
  it('suggests Homebrew on macOS', () => {
    expect(cloudflaredInstallHint('darwin')).toContain('brew install cloudflared');
  });

  it('suggests winget on Windows', () => {
    const hint = cloudflaredInstallHint('win32');
    expect(hint.toLowerCase()).toContain('winget');
  });

  it('points to the download page on Linux/other platforms', () => {
    expect(cloudflaredInstallHint('linux')).toContain('developers.cloudflare.com');
  });
});
