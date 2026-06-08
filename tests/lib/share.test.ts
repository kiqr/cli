import {describe, expect, it} from 'vitest';
import {AGENT_PORT} from '../../src/lib/agent.js';
import {
  buildCloudflaredArgs,
  clearShareUrlFromContainer,
  cloudflaredInstallHint,
  isCloudflaredInstalled,
  parseTunnelUrl,
  resolveProjectContainerId,
  SHARE_URL_CONTAINER_PATH,
  TRAEFIK_BASE_URL,
  writeShareUrlToContainer,
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

describe('SHARE_URL_CONTAINER_PATH', () => {
  it('is under /tmp so a container recreate clears it', () => {
    // /tmp is in the container's writable layer (or tmpfs on some setups),
    // so a fresh `kiqr restart` invalidates a stale tunnel URL automatically.
    expect(SHARE_URL_CONTAINER_PATH.startsWith('/tmp/')).toBe(true);
  });
});

describe('resolveProjectContainerId', () => {
  it('queries docker by compose project + service labels', () => {
    let captured = '';
    const fakeExec = (cmd: string) => {
      captured = cmd;
      return 'abc123\n';
    };
    const id = resolveProjectContainerId('proj-xyz', 'wordpress', fakeExec);
    expect(id).toBe('abc123');
    // Must filter by BOTH labels -- project alone matches every service
    // (wordpress, mariadb, phpmyadmin) and we'd exec into the wrong one.
    expect(captured).toContain('label=com.docker.compose.project=proj-xyz');
    expect(captured).toContain('label=com.docker.compose.service=wordpress');
  });

  it('returns null when no container matches', () => {
    const fakeExec = () => '';
    expect(resolveProjectContainerId('nope', 'wordpress', fakeExec)).toBeNull();
  });

  it('returns null when docker is unavailable / errors', () => {
    const fakeExec = () => {
      throw new Error('cannot connect to docker daemon');
    };
    expect(resolveProjectContainerId('proj', 'wordpress', fakeExec)).toBeNull();
  });
});

describe('writeShareUrlToContainer', () => {
  // The helper internally resolves the running container's ID via
  // `docker ps --filter label=...`. In tests we stub that single shell
  // call by intercepting the global execSync via the injected `exec` fn,
  // but since resolution uses the module-level execSync directly, we
  // accept that these tests exercise the URL-validation and command-shape
  // paths and rely on integration coverage for the live docker lookup.

  it('refuses to write malformed/unsafe URLs (no shell injection)', () => {
    const calls: string[] = [];
    const errors: unknown[] = [];
    writeShareUrlToContainer(
      'project-id-123',
      'https://x.trycloudflare.com; rm -rf /',
      (cmd) => calls.push(cmd),
      (err) => errors.push(err),
    );
    expect(calls).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(String(errors[0])).toMatch(/malformed/i);
  });

  it('reports a missing container via onError when resolution fails', () => {
    // Pass a project id that no docker container is labelled with -- the
    // internal label lookup returns no container ID and the helper bails
    // before touching the injected `exec`.
    const calls: string[] = [];
    const errors: unknown[] = [];
    writeShareUrlToContainer(
      'project-id-does-not-exist-12345',
      'https://x.trycloudflare.com',
      (cmd) => calls.push(cmd),
      (err) => errors.push(err),
    );
    expect(calls).toHaveLength(0);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('clearShareUrlFromContainer', () => {
  it("is a no-op when no matching container is running (doesn't throw)", () => {
    // Same rationale as writeShareUrlToContainer: when the container is
    // already gone there is nothing to clean and we mustn't fail the
    // tunnel-exit path.
    expect(() =>
      clearShareUrlFromContainer('project-id-does-not-exist-12345'),
    ).not.toThrow();
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
