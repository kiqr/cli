import YAML from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {getTraefikDir} from './paths.js';
import {isContainerRunning, runDockerCompose} from './docker.js';

export const KIQR_NETWORK = 'kiqr';
const TRAEFIK_CONTAINER = 'kiqr-traefik';

export function generateTraefikCompose(): string {
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
        ports: ['5477:5477', '8080:8080'],
        volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
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
  const filePath = path.join(traefikDir, 'compose.yaml');
  fs.mkdirSync(traefikDir, {recursive: true});
  fs.writeFileSync(filePath, generateTraefikCompose(), 'utf-8');
  return filePath;
}

export function isTraefikRunning(): boolean {
  return isContainerRunning(TRAEFIK_CONTAINER);
}

export function ensureTraefikRunning(dir?: string): void {
  if (isTraefikRunning()) return;
  const traefikDir = dir ?? getTraefikDir();
  const composePath = writeTraefikCompose(traefikDir);
  ensureKiqrNetwork();
  runDockerCompose(composePath, 'up', ['-d']);
}

export function ensureKiqrNetwork(): void {
  try {
    execSync(`docker network create ${KIQR_NETWORK}`, {stdio: 'pipe'});
  } catch {
    // Network may already exist
  }
}
