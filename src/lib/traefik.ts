import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {runDockerCompose} from './docker.js';
import {writeNginxSplashConf} from './nginx-splash.js';
import {getTraefikDir} from './paths.js';
import {writeSplashPage} from './splash.js';

export const KIQR_NETWORK = 'kiqr';
const TRAEFIK_CONTAINER = 'kiqr-traefik';

export function generateTraefikCompose(traefikDir: string): string {
  const compose = {
    services: {
      traefik: {
        image: 'traefik:v2.11',
        container_name: TRAEFIK_CONTAINER,
        command: [
          '--providers.docker=true',
          '--providers.docker.exposedbydefault=false',
          `--providers.docker.network=${KIQR_NETWORK}`,
          '--entrypoints.web.address=:5477',
          '--api.insecure=true',
        ],
        ports: ['5477:5477'],
        volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
        networks: [KIQR_NETWORK],
        restart: 'unless-stopped',
      },
      splash: {
        image: 'nginx:1.30-alpine',
        container_name: 'kiqr-splash',
        volumes: [
          `${path.join(traefikDir, 'splash.html')}:/usr/share/nginx/html/splash.html:ro`,
          `${path.join(traefikDir, 'splash-nginx.conf')}:/etc/nginx/conf.d/default.conf:ro`,
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

export function writeTraefikCompose(dir?: string): string {
  const traefikDir = dir ?? getTraefikDir();
  fs.mkdirSync(traefikDir, {recursive: true});

  writeSplashPage(traefikDir);
  writeNginxSplashConf(traefikDir);

  const filePath = path.join(traefikDir, 'compose.yaml');
  fs.writeFileSync(filePath, generateTraefikCompose(traefikDir), 'utf-8');
  return filePath;
}

export function ensureTraefikRunning(dir?: string): void {
  const traefikDir = dir ?? getTraefikDir();
  const composePath = writeTraefikCompose(traefikDir);
  ensureKiqrNetwork();
  runDockerCompose(composePath, 'up', ['-d']);
}

export function stopTraefik(dir?: string): void {
  const traefikDir = dir ?? getTraefikDir();
  const composePath = path.join(traefikDir, 'compose.yaml');
  if (!fs.existsSync(composePath)) return;
  try {
    runDockerCompose(composePath, 'down');
  } catch {
    // Already stopped
  }
}

export function stopTraefikIfIdle(dir?: string): void {
  if (hasRunningProjects()) return;
  stopTraefik(dir);
}

function hasRunningProjects(): boolean {
  try {
    const output = execSync(
      `docker ps --filter "network=${KIQR_NETWORK}" --filter "status=running" --format "{{.Names}}"`,
      {stdio: 'pipe'},
    )
      .toString()
      .trim();

    if (!output) return false;

    const kiqrInfra = new Set([TRAEFIK_CONTAINER, 'kiqr-splash']);
    const running = output.split('\n').filter((name) => !kiqrInfra.has(name));
    return running.length > 0;
  } catch {
    return false;
  }
}

export function ensureKiqrNetwork(): void {
  try {
    execSync(`docker network create ${KIQR_NETWORK}`, {stdio: 'pipe'});
  } catch {
    // Network may already exist
  }
}
