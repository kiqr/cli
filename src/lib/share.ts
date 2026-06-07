import {execSync} from 'node:child_process';
import {AGENT_PORT} from './agent.js';

/**
 * `kiqr share` exposes the developer's running local WordPress site at a public
 * URL through a Cloudflare "quick tunnel" -- an instant, account-less tunnel
 * provided by the external `cloudflared` binary.
 *
 * The crux is the kiqr agent's Traefik reverse proxy on {@link AGENT_PORT}: it
 * routes purely by the `Host` header (`Host(<project hostname>)`). A tunnel
 * pointed naively at Traefik would forward `Host: <random>.trycloudflare.com`,
 * which matches no project router and falls through to the splash page. So we
 * run cloudflared with `--http-host-header <project hostname>` to make Traefik
 * route correctly, while WordPress reads the real public host from the
 * `X-Forwarded-Host` header cloudflared still forwards (see
 * BitnamiRuntimeProvider's WORDPRESS_CONFIG_EXTRA).
 */

/** Base URL of the local kiqr agent (Traefik) that fronts every project. */
export const TRAEFIK_BASE_URL = `http://localhost:${AGENT_PORT}`;

export type Exec = (command: string) => void;

const defaultExec: Exec = (command) => {
  execSync(command, {stdio: 'pipe'});
};

/**
 * Whether the `cloudflared` binary is available on PATH. The check is injected
 * so it can be exercised in tests without a real binary.
 */
export function isCloudflaredInstalled(exec: Exec = defaultExec): boolean {
  try {
    exec('cloudflared --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the cloudflared argument vector for a quick tunnel that points at the
 * local Traefik proxy but rewrites the upstream `Host` header so Traefik routes
 * the request to the right project.
 */
export function buildCloudflaredArgs(localUrl: string, hostHeader: string): string[] {
  return [
    'tunnel',
    '--no-autoupdate',
    '--url',
    localUrl,
    '--http-host-header',
    hostHeader,
  ];
}

const TUNNEL_URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

/**
 * Extract the public `https://<sub>.trycloudflare.com` URL from a single line
 * of cloudflared output. cloudflared prints the URL inside an ASCII box with
 * surrounding text and may include ANSI color codes, so we scan for the URL
 * anywhere in the line. Returns null when the line contains no such URL.
 */
export function parseTunnelUrl(line: string): string | null {
  const match = line.match(TUNNEL_URL_PATTERN);
  return match ? match[0] : null;
}

/**
 * Short, per-platform guidance for installing cloudflared. Defaults to the
 * current process platform but is parameterized for testing.
 */
export function cloudflaredInstallHint(
  platform: NodeJS.Platform = process.platform,
): string {
  switch (platform) {
    case 'darwin':
      return 'Install it with Homebrew:\n  brew install cloudflared';
    case 'win32':
      return 'Install it with winget:\n  winget install --id Cloudflare.cloudflared\nor download it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/';
    default:
      return 'Install it from your package manager or download it from\n  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/';
  }
}
