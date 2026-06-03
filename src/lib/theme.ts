import fs from 'node:fs';
import path from 'node:path';
import type {ThemeInfo} from '../types/config.js';

export function parseThemeName(css: string): string | null {
  const match = css.match(/Theme Name:\s*(.+)/i);
  if (!match?.[1]) return null;
  return match[1].trim();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function detectTheme(dir: string = process.cwd()): ThemeInfo | null {
  const stylePath = path.join(dir, 'style.css');

  if (!fs.existsSync(stylePath)) return null;

  const content = fs.readFileSync(stylePath, 'utf-8');
  const name = parseThemeName(content);

  if (!name) return null;

  return {
    name,
    slug: slugify(name),
    path: dir,
  };
}
