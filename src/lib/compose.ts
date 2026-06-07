import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type {RuntimeConfig} from '../providers/RuntimeProvider.js';
import {KIQR_NETWORK} from './agent.js';
import {createRuntimeProvider} from './runtime.js';

export function generateProjectCompose(
  config: RuntimeConfig,
  runtime: string = 'bitnami',
): string {
  const provider = createRuntimeProvider(runtime);
  const services = provider.generateComposeServices(config);

  const compose = {
    services,
    networks: {
      [KIQR_NETWORK]: {external: true},
      default: {},
    },
    volumes: {
      wordpress_data: {},
      mariadb_data: {},
    },
  };

  return YAML.stringify(compose, {lineWidth: 0});
}

export function writeProjectCompose(config: RuntimeConfig, outputDir: string): string {
  const yaml = generateProjectCompose(config);
  const filePath = path.join(outputDir, 'compose.yaml');
  fs.mkdirSync(outputDir, {recursive: true});
  fs.writeFileSync(filePath, yaml, 'utf-8');
  return filePath;
}
