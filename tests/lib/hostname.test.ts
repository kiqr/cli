import {describe, expect, it} from 'vitest';
import {buildProjectHostname, sanitizeHostname} from '../../src/lib/hostname.js';

describe('sanitizeHostname', () => {
  it('lowercases and strips .local suffix', () => {
    expect(sanitizeHostname('Rasmus-MacBook.local')).toBe('rasmus-macbook');
  });

  it('removes invalid characters', () => {
    expect(sanitizeHostname("Anna's Laptop!")).toBe('annas-laptop');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeHostname('my--host--name')).toBe('my-host-name');
  });

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeHostname('-host-')).toBe('host');
  });
});

describe('buildProjectHostname', () => {
  it('uses the project slug directly under lvh.me', () => {
    expect(buildProjectHostname('my-theme')).toBe('my-theme.lvh.me');
  });

  it('builds a phpmyadmin subdomain', () => {
    expect(buildProjectHostname('my-theme', 'phpmyadmin')).toBe(
      'phpmyadmin.my-theme.lvh.me',
    );
  });
});
