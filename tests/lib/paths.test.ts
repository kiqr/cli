import {describe, it, expect, vi, beforeEach} from 'vitest';
import {getKiqrDataDir, getProjectRuntimeDir} from '../../src/lib/paths.js';

describe('getKiqrDataDir', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns macOS path on darwin', () => {
    vi.stubEnv('HOME', '/Users/testuser');
    const result = getKiqrDataDir('darwin');
    expect(result).toBe('/Users/testuser/Library/Application Support/Kiqr');
  });

  it('returns Linux path on linux', () => {
    vi.stubEnv('HOME', '/home/testuser');
    const result = getKiqrDataDir('linux');
    expect(result).toBe('/home/testuser/.config/kiqr');
  });

  it('returns Windows path when APPDATA is set', () => {
    vi.stubEnv('APPDATA', 'C:\\Users\\testuser\\AppData\\Roaming');
    const result = getKiqrDataDir('win32');
    expect(result).toBe('C:\\Users\\testuser\\AppData\\Roaming/Kiqr');
  });

  it('throws on unsupported platform', () => {
    expect(() => getKiqrDataDir('freebsd' as NodeJS.Platform)).toThrow();
  });
});

describe('getProjectRuntimeDir', () => {
  it('returns path under data dir with project id', () => {
    vi.stubEnv('HOME', '/Users/testuser');
    const result = getProjectRuntimeDir('abc-123', 'darwin');
    expect(result).toBe('/Users/testuser/Library/Application Support/Kiqr/projects/abc-123');
  });
});
