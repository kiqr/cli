import {describe, it, expect, vi} from 'vitest';
import {sanitizeHostname, buildProjectHostname} from '../../src/lib/hostname.js';
import os from 'node:os';

vi.mock('node:os', () => ({
  default: {hostname: vi.fn()},
  hostname: vi.fn(),
}));

const mockHostname = vi.mocked(os.hostname);

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
  it('combines project slug with machine hostname', () => {
    mockHostname.mockReturnValue('rasmus-macbook.local');
    expect(buildProjectHostname('my-theme')).toBe('my-theme.rasmus-macbook.lvh.me');
  });

  it('builds phpmyadmin subdomain', () => {
    mockHostname.mockReturnValue('rasmus-macbook.local');
    expect(buildProjectHostname('my-theme', 'phpmyadmin')).toBe(
      'phpmyadmin.my-theme.rasmus-macbook.lvh.me',
    );
  });
});
