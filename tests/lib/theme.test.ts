import {describe, it, expect} from 'vitest';
import {parseThemeName, slugify} from '../../src/lib/theme.js';

describe('parseThemeName', () => {
  it('extracts theme name from valid style.css content', () => {
    const css = `/*\nTheme Name: My Awesome Theme\n*/`;
    expect(parseThemeName(css)).toBe('My Awesome Theme');
  });

  it('returns null when Theme Name header is missing', () => {
    const css = `/* just a comment */\nbody { color: red; }`;
    expect(parseThemeName(css)).toBeNull();
  });

  it('handles extra whitespace around Theme Name', () => {
    const css = `/*\n  Theme Name:   Spacey Theme  \n*/`;
    expect(parseThemeName(css)).toBe('Spacey Theme');
  });

  it('handles Theme Name not inside a block comment', () => {
    const css = `Theme Name: Bare Theme\nbody {}`;
    expect(parseThemeName(css)).toBe('Bare Theme');
  });
});

describe('slugify', () => {
  it('converts name to lowercase slug', () => {
    expect(slugify('My Awesome Theme')).toBe('my-awesome-theme');
  });

  it('handles special characters', () => {
    expect(slugify("Bob's Theme (v2)")).toBe('bobs-theme-v2');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('Theme -- Name')).toBe('theme-name');
  });
});
