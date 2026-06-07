import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {z} from 'zod';
import type {LocalConfig, ProjectConfig} from '../types/config.js';

const PROJECT_CONFIG_FILE = 'kiqr.yaml';
const LOCAL_CONFIG_FILE = 'config.yaml';

const projectConfigSchema = z.object({
  project_id: z.string().min(1, 'project_id is required'),
  name: z.string().min(1, 'name is required'),
  wordpress: z.object({
    version: z.string().min(1, 'wordpress.version is required'),
    php_version: z.string().min(1, 'wordpress.php_version is required'),
  }),
  development: z.object({
    dynamic_urls: z.boolean(),
  }),
}) satisfies z.ZodType<ProjectConfig>;

const localConfigSchema = z.object({
  project_id: z.string().min(1, 'project_id is required'),
  runtime: z.string().min(1, 'runtime is required'),
  db_password: z.string().min(1, 'db_password is required'),
  login_secret: z.string().min(1, 'login_secret is required'),
  wordpress_version: z.string().optional(),
  created_at: z.string().min(1, 'created_at is required'),
}) satisfies z.ZodType<LocalConfig>;

/**
 * Turn a Zod validation error into a single, human-readable line so a
 * hand-edited config file produces an actionable message instead of a
 * cryptic downstream crash.
 */
function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const pathStr = issue.path.join('.');
      return pathStr ? `${pathStr}: ${issue.message}` : issue.message;
    })
    .join(', ');
}

function parseConfig<T>(
  schema: z.ZodType<T>,
  content: string,
  fileName: string,
): T {
  let parsed: unknown;
  try {
    parsed = YAML.parse(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${fileName} is not valid YAML: ${detail}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${fileName} is invalid: ${formatIssues(result.error)}`);
  }
  return result.data;
}

export function projectConfigExists(dir: string = process.cwd()): boolean {
  return fs.existsSync(path.join(dir, PROJECT_CONFIG_FILE));
}

export function readProjectConfig(
  dir: string = process.cwd(),
): ProjectConfig | null {
  const filePath = path.join(dir, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseConfig(projectConfigSchema, content, PROJECT_CONFIG_FILE);
}

export function writeProjectConfig(
  config: ProjectConfig,
  dir: string = process.cwd(),
): void {
  const filePath = path.join(dir, PROJECT_CONFIG_FILE);
  fs.writeFileSync(filePath, YAML.stringify(config), 'utf-8');
}

export function readLocalConfig(dir: string): LocalConfig | null {
  const filePath = path.join(dir, LOCAL_CONFIG_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseConfig(localConfigSchema, content, LOCAL_CONFIG_FILE);
}

export function writeLocalConfig(config: LocalConfig, dir: string): void {
  fs.mkdirSync(dir, {recursive: true});
  const filePath = path.join(dir, LOCAL_CONFIG_FILE);
  fs.writeFileSync(filePath, YAML.stringify(config), 'utf-8');
}
