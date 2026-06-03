import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type {ProjectConfig, LocalConfig} from '../types/config.js';

const PROJECT_CONFIG_FILE = 'kiqr.yaml';
const LOCAL_CONFIG_FILE = 'config.yaml';

export function projectConfigExists(dir: string = process.cwd()): boolean {
  return fs.existsSync(path.join(dir, PROJECT_CONFIG_FILE));
}

export function readProjectConfig(dir: string = process.cwd()): ProjectConfig | null {
  const filePath = path.join(dir, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as ProjectConfig;
}

export function writeProjectConfig(config: ProjectConfig, dir: string = process.cwd()): void {
  const filePath = path.join(dir, PROJECT_CONFIG_FILE);
  fs.writeFileSync(filePath, YAML.stringify(config), 'utf-8');
}

export function readLocalConfig(dir: string): LocalConfig | null {
  const filePath = path.join(dir, LOCAL_CONFIG_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as LocalConfig;
}

export function writeLocalConfig(config: LocalConfig, dir: string): void {
  fs.mkdirSync(dir, {recursive: true});
  const filePath = path.join(dir, LOCAL_CONFIG_FILE);
  fs.writeFileSync(filePath, YAML.stringify(config), 'utf-8');
}
