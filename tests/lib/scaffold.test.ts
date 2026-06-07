import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {generateTheme, type ScaffoldOptions, writeTheme} from '../../src/lib/scaffold.js';
import {slugify} from '../../src/lib/theme.js';

function blockOpts(overrides: Partial<ScaffoldOptions> = {}): ScaffoldOptions {
  return {
    name: 'My Cool Theme',
    slug: 'my-cool-theme',
    type: 'block',
    ...overrides,
  };
}

function classicOpts(overrides: Partial<ScaffoldOptions> = {}): ScaffoldOptions {
  return {
    name: 'My Cool Theme',
    slug: 'my-cool-theme',
    type: 'classic',
    ...overrides,
  };
}

describe('slug handling', () => {
  it('slugifies a human-readable name', () => {
    expect(slugify('My Cool Theme')).toBe('my-cool-theme');
  });
});

describe('generateTheme (block)', () => {
  const files = generateTheme(blockOpts());

  it('returns the expected block file set', () => {
    expect(Object.keys(files).sort()).toEqual(
      [
        '.gitignore',
        'functions.php',
        'parts/footer.html',
        'parts/header.html',
        'patterns/hero.php',
        'readme.txt',
        'style.css',
        'templates/index.html',
        'templates/page.html',
        'templates/single.html',
        'theme.json',
      ].sort(),
    );
  });

  it('style.css contains the theme header and slug as Text Domain', () => {
    const css = files['style.css'];
    expect(css).toContain('Theme Name: My Cool Theme');
    expect(css).toContain('Text Domain: my-cool-theme');
    expect(css).toContain('Version: 0.1.0');
    expect(css).toContain('Requires at least: 6.5');
    expect(css).toContain('Requires PHP: 8.0');
  });

  it('theme.json is valid JSON with version 3, a palette and a schema', () => {
    const parsed = JSON.parse(files['theme.json']!);
    expect(parsed.version).toBe(3);
    expect(parsed.$schema).toBe('https://schemas.wp.org/trunk/theme.json');
    expect(Array.isArray(parsed.settings.color.palette)).toBe(true);
    expect(parsed.settings.color.palette.length).toBeGreaterThan(0);
    expect(parsed.settings.appearanceTools).toBe(true);
    expect(Array.isArray(parsed.settings.typography.fontFamilies)).toBe(true);
    expect(Array.isArray(parsed.settings.typography.fontSizes)).toBe(true);
    expect(parsed.settings.layout.contentSize).toBeTruthy();
    expect(parsed.settings.layout.wideSize).toBeTruthy();
    expect(parsed.styles).toBeTruthy();
  });

  it('templates reference template parts', () => {
    for (const tpl of [
      'templates/index.html',
      'templates/single.html',
      'templates/page.html',
    ]) {
      expect(files[tpl]).toContain('wp:template-part');
      expect(files[tpl]).toContain('"slug":"header"');
      expect(files[tpl]).toContain('"slug":"footer"');
    }
    expect(files['templates/index.html']).toContain('wp:query');
    expect(files['templates/single.html']).toContain('wp:post-content');
  });

  it('parts contain real block markup', () => {
    expect(files['parts/header.html']).toContain('wp:site-title');
    expect(files['parts/header.html']).toContain('wp:navigation');
    expect(files['parts/footer.html']).toContain('wp:site-title');
  });

  it('hero pattern has a valid pattern header', () => {
    const pattern = files['patterns/hero.php']!;
    expect(pattern).toContain('Title: Hero');
    expect(pattern).toContain('Slug: my-cool-theme/hero');
    expect(pattern).toContain('Categories:');
    expect(pattern).toContain('wp:button');
  });

  it('functions.php is present and uses the slug as text domain', () => {
    const fns = files['functions.php']!;
    expect(fns).toContain('<?php');
    expect(fns).toContain("load_theme_textdomain('my-cool-theme'");
    expect(fns).toContain('wp_enqueue_style');
    expect(fns).toContain("add_theme_support('editor-styles')");
  });

  it('uses author and description overrides', () => {
    const custom = generateTheme(
      blockOpts({author: 'Jane Dev', description: 'A bespoke theme.'}),
    );
    expect(custom['style.css']).toContain('Author: Jane Dev');
    expect(custom['style.css']).toContain('Description: A bespoke theme.');
  });
});

describe('generateTheme (classic)', () => {
  const files = generateTheme(classicOpts());

  it('returns the expected classic file set', () => {
    expect(Object.keys(files).sort()).toEqual(
      [
        '.gitignore',
        'footer.php',
        'functions.php',
        'header.php',
        'index.php',
        'readme.txt',
        'style.css',
      ].sort(),
    );
  });

  it('includes index.php, header.php and footer.php with markup', () => {
    expect(files['index.php']).toContain('get_header()');
    expect(files['index.php']).toContain('have_posts()');
    expect(files['header.php']).toContain('wp_head()');
    expect(files['header.php']).toContain('<!DOCTYPE html>');
    expect(files['footer.php']).toContain('wp_footer()');
  });

  it('functions.php enqueues styles and adds theme support', () => {
    const fns = files['functions.php']!;
    expect(fns).toContain('wp_enqueue_style');
    expect(fns).toContain("add_theme_support('title-tag')");
    expect(fns).toContain("load_theme_textdomain('my-cool-theme'");
  });

  it('style.css contains the theme header', () => {
    expect(files['style.css']).toContain('Theme Name: My Cool Theme');
    expect(files['style.css']).toContain('Text Domain: my-cool-theme');
  });
});

describe('writeTheme', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-scaffold-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, {recursive: true, force: true});
  });

  it('writes all files (including nested dirs) to disk', () => {
    const files = generateTheme(blockOpts());
    const target = path.join(tmpRoot, 'my-cool-theme');
    writeTheme(target, files);

    for (const rel of Object.keys(files)) {
      const full = path.join(target, rel);
      expect(fs.existsSync(full)).toBe(true);
      expect(fs.readFileSync(full, 'utf-8')).toBe(files[rel]);
    }
    expect(fs.existsSync(path.join(target, 'templates', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'parts', 'header.html'))).toBe(true);
  });

  it('writes into an existing empty directory', () => {
    const target = path.join(tmpRoot, 'empty-theme');
    fs.mkdirSync(target);
    const files = generateTheme(classicOpts());
    expect(() => writeTheme(target, files)).not.toThrow();
    expect(fs.existsSync(path.join(target, 'index.php'))).toBe(true);
  });

  it('refuses to clobber a non-empty existing directory', () => {
    const target = path.join(tmpRoot, 'occupied');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'keep.txt'), 'do not delete');

    const files = generateTheme(blockOpts());
    expect(() => writeTheme(target, files)).toThrow(/already exists/i);
    // existing content is untouched
    expect(fs.readFileSync(path.join(target, 'keep.txt'), 'utf-8')).toBe('do not delete');
  });
});
