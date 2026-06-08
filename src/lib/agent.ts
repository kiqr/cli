import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {
  isContainerRunning as defaultIsContainerRunning,
  runDockerCompose,
} from './docker.js';
import {writeNginxSplashConf} from './nginx-splash.js';
import {getTraefikDir} from './paths.js';
import {writeSplashPage} from './splash.js';

/**
 * The "kiqr agent" is the shared, persistent background service that backs
 * every kiqr project. Today it bundles the Traefik reverse proxy and the
 * splash fallback page; in the future it will also host the dashboard, a mail
 * catcher, and the collaboration tunnel client.
 *
 * It runs as a single Docker Compose project (`kiqr-agent`) and persists
 * independently of any individual project. Container names and the network
 * are deliberately unchanged from the previous standalone Traefik stack so
 * existing setups keep working.
 */

export const KIQR_NETWORK = 'kiqr';
export const AGENT_PROJECT = 'kiqr-agent';
export const AGENT_PORT = 5477;

export const AGENT_CONTAINERS = ['kiqr-traefik', 'kiqr-splash'] as const;

const TRAEFIK_CONTAINER = 'kiqr-traefik';
const SPLASH_CONTAINER = 'kiqr-splash';

export interface AgentStatus {
  running: boolean;
  containers: {name: string; running: boolean}[];
  port: number;
}

export interface AgentStatusDeps {
  isContainerRunning: (name: string) => boolean;
}

export function generateAgentCompose(agentDir: string): string {
  const compose = {
    name: AGENT_PROJECT,
    services: {
      traefik: {
        image: 'traefik:v2.11',
        container_name: TRAEFIK_CONTAINER,
        command: [
          '--providers.docker=true',
          '--providers.docker.exposedbydefault=false',
          `--providers.docker.network=${KIQR_NETWORK}`,
          `--entrypoints.web.address=:${AGENT_PORT}`,
          '--api.insecure=true',
          // Trust X-Forwarded-* headers from ANY peer. Without this, Traefik
          // rewrites incoming X-Forwarded-Proto and X-Forwarded-Host to its
          // own values, so `kiqr share` (cloudflared → localhost → Traefik
          // via Docker port mapping) loses the original https scheme and the
          // WordPress mu-plugin can't tell the request came over https.
          //
          // We use `insecure=true` instead of an `trustedIPs` CIDR list
          // because Docker Desktop for macOS/Windows NATs host→container
          // traffic through its VM, and the source IP Traefik observes
          // doesn't always land in the expected RFC1918 range. Since the
          // kiqr agent is a single-user local dev tool and Traefik listens
          // only on the host, the risk of an outside peer spoofing
          // X-Forwarded-* is bounded to the developer's own machine.
          '--entrypoints.web.forwardedHeaders.insecure=true',
        ],
        ports: [`${AGENT_PORT}:${AGENT_PORT}`],
        volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
        networks: [KIQR_NETWORK],
        restart: 'unless-stopped',
      },
      splash: {
        image: 'nginx:1.30-alpine',
        container_name: SPLASH_CONTAINER,
        volumes: [
          `${path.join(agentDir, 'splash.html')}:/usr/share/nginx/html/splash.html:ro`,
          `${path.join(agentDir, 'splash-nginx.conf')}:/etc/nginx/conf.d/default.conf:ro`,
        ],
        labels: [
          'traefik.enable=true',
          'traefik.http.routers.kiqr-splash.rule=PathPrefix(`/`)',
          'traefik.http.routers.kiqr-splash.entrypoints=web',
          'traefik.http.routers.kiqr-splash.priority=1',
          'traefik.http.services.kiqr-splash.loadbalancer.server.port=80',
        ],
        networks: [KIQR_NETWORK],
        restart: 'unless-stopped',
      },
    },
    networks: {
      [KIQR_NETWORK]: {
        external: true,
      },
    },
  };

  return YAML.stringify(compose, {lineWidth: 0});
}

export function writeAgentCompose(dir?: string): string {
  const agentDir = dir ?? getTraefikDir();
  fs.mkdirSync(agentDir, {recursive: true});

  writeSplashPage(agentDir);
  writeNginxSplashConf(agentDir);

  const filePath = path.join(agentDir, 'compose.yaml');
  fs.writeFileSync(filePath, generateAgentCompose(agentDir), 'utf-8');
  return filePath;
}

export function ensureAgentRunning(dir?: string): void {
  const agentDir = dir ?? getTraefikDir();
  const composePath = writeAgentCompose(agentDir);
  ensureKiqrNetwork();
  runDockerCompose(composePath, 'up', ['-d']);
}

export function stopAgent(dir?: string): void {
  const agentDir = dir ?? getTraefikDir();
  const composePath = path.join(agentDir, 'compose.yaml');
  if (!fs.existsSync(composePath)) return;
  try {
    runDockerCompose(composePath, 'down');
  } catch {
    // Already stopped
  }
}

export function restartAgent(dir?: string): void {
  stopAgent(dir);
  ensureAgentRunning(dir);
}

export function getAgentStatus(
  deps: AgentStatusDeps = {isContainerRunning: defaultIsContainerRunning},
): AgentStatus {
  const containers = AGENT_CONTAINERS.map((name) => ({
    name,
    running: deps.isContainerRunning(name),
  }));
  return {
    running: containers.every((c) => c.running),
    containers,
    port: AGENT_PORT,
  };
}

export function isAgentRunning(): boolean {
  return getAgentStatus().running;
}

export function ensureKiqrNetwork(): void {
  try {
    execSync(`docker network create ${KIQR_NETWORK}`, {stdio: 'pipe'});
  } catch {
    // Network may already exist
  }
}
