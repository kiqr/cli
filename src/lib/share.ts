import {execSync} from 'node:child_process';
import {AGENT_PORT} from './agent.js';

/**
 * Path inside the WordPress container where `kiqr share` drops the active
 * tunnel URL while sharing. The mu-plugin's WORDPRESS_CONFIG_EXTRA reads this
 * file to learn the public hostname/scheme -- cloudflared's quick tunnels
 * don't carry the original Host through to the origin, so we plumb it here
 * out-of-band instead. Lives under `/tmp` so it disappears on container
 * recreate (a fresh `kiqr restart` while sharing legitimately invalidates it).
 */
export const SHARE_URL_CONTAINER_PATH = '/tmp/kiqr-share-url';

/**
 * Look up the running container ID for a project + service via docker compose
 * labels. Returns `null` if no container matches (not running, wrong project,
 * etc.). We resolve by labels rather than name because docker-compose appends
 * a replica suffix (`-1`) to its container names; assuming a fixed suffix
 * silently breaks the moment compose changes its naming convention.
 */
export function resolveProjectContainerId(
  projectId: string,
  service: string,
  exec: (cmd: string) => string = (cmd) => execSync(cmd, {stdio: 'pipe'}).toString(),
): string | null {
  try {
    const out = exec(
      `docker ps -q --filter "label=com.docker.compose.project=${projectId}" --filter "label=com.docker.compose.service=${service}"`,
    );
    const id = out.trim().split('\n')[0]?.trim() ?? '';
    return id || null;
  } catch {
    return null;
  }
}

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
 * Write the active tunnel URL into the running WordPress container so the
 * mu-plugin can pick it up for the current request. Best-effort: a failure
 * (container gone, docker socket missing) is reported via the caller's
 * `onError`, never thrown -- the tunnel still works for direct browsing.
 *
 * Resolves the actual docker container ID via labels rather than constructing
 * a name string; docker-compose's replica-suffix convention has bitten this
 * code path once already.
 */
export function writeShareUrlToContainer(
  projectId: string,
  url: string,
  exec: Exec = defaultExec,
  onError?: (err: unknown) => void,
): void {
  // Shell-safe: only allow [A-Za-z0-9:/._-] in the URL. Quick-tunnel URLs
  // always match this; reject anything else rather than risk injecting into
  // the `sh -c` argument.
  if (!/^[A-Za-z0-9:/._-]+$/.test(url)) {
    onError?.(new Error(`Refusing to write malformed share URL: ${url}`));
    return;
  }
  const id = resolveProjectContainerId(projectId, 'wordpress');
  if (!id) {
    onError?.(
      new Error(`Could not resolve WordPress container for project ${projectId}`),
    );
    return;
  }
  try {
    exec(`docker exec ${id} sh -c 'printf %s ${url} > ${SHARE_URL_CONTAINER_PATH}'`);
  } catch (err) {
    onError?.(err);
  }
}

/**
 * Remove the tunnel-URL marker file from the WordPress container. Called on
 * tunnel exit so subsequent requests don't keep masquerading as tunneled.
 * Best-effort, same rationale as {@link writeShareUrlToContainer}.
 */
export function clearShareUrlFromContainer(
  projectId: string,
  exec: Exec = defaultExec,
  onError?: (err: unknown) => void,
): void {
  const id = resolveProjectContainerId(projectId, 'wordpress');
  if (!id) return; // container already gone -- nothing to clean
  try {
    exec(`docker exec ${id} rm -f ${SHARE_URL_CONTAINER_PATH}`);
  } catch (err) {
    onError?.(err);
  }
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
