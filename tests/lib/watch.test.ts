import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createFileWatcher, getRelativePath} from '../../src/lib/watch.js';

describe('watch', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-watch-test-'));
  });

  afterEach(() => {
    // Clean up any created files
    try {
      fs.rmSync(tempDir, {recursive: true, force: true});
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getRelativePath', () => {
    it('returns relative path from base directory', () => {
      const result = getRelativePath('/project/theme', '/project/theme/index.php');
      expect(result).toBe('index.php');
    });

    it('handles nested directories', () => {
      const result = getRelativePath(
        '/project/theme',
        '/project/theme/src/components/Header.php',
      );
      expect(result).toBe('src/components/Header.php');
    });
  });

  describe('createFileWatcher', () => {
    it(
      'reports file changes',
      () =>
        new Promise<void>((resolve) => {
          const callback = vi.fn();
          const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

          // Give chokidar time to begin watching before writing.
          setTimeout(() => {
            const testFile = path.join(tempDir, 'test.php');
            fs.writeFileSync(testFile, '<?php // test');
          }, 200);

          // Give it time to detect the change
          setTimeout(() => {
            watcher.stop();
            // At least one callback should have been called (add or change)
            expect(callback.mock.calls.length).toBeGreaterThan(0);
            resolve();
          }, 800);
        }),
      5000,
    );

    it(
      'detects changes in nested subdirectories',
      () =>
        new Promise<void>((resolve) => {
          const callback = vi.fn();
          const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

          setTimeout(() => {
            const nestedDir = path.join(tempDir, 'src', 'components', 'deep');
            fs.mkdirSync(nestedDir, {recursive: true});
            fs.writeFileSync(path.join(nestedDir, 'Header.php'), '<?php // nested');
          }, 200);

          setTimeout(() => {
            watcher.stop();
            const matched = callback.mock.calls.some(
              ([, filePath]) =>
                typeof filePath === 'string' && filePath.endsWith('Header.php'),
            );
            expect(matched).toBe(true);
            resolve();
          }, 800);
        }),
      5000,
    );

    it(
      'ignores files without matching extensions',
      () =>
        new Promise<void>((resolve) => {
          const callback = vi.fn();
          const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

          setTimeout(() => {
            const testFile = path.join(tempDir, 'test.txt');
            fs.writeFileSync(testFile, 'test content');
          }, 200);

          setTimeout(() => {
            watcher.stop();
            // No callbacks should have been called for .txt files
            expect(callback).not.toHaveBeenCalled();
            resolve();
          }, 800);
        }),
      5000,
    );

    it(
      'ignores node_modules directories',
      () =>
        new Promise<void>((resolve) => {
          const callback = vi.fn();
          const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

          setTimeout(() => {
            // Create a file in node_modules
            const nodeModulesDir = path.join(tempDir, 'node_modules');
            fs.mkdirSync(nodeModulesDir, {recursive: true});
            fs.writeFileSync(path.join(nodeModulesDir, 'test.php'), '<?php // test');
          }, 200);

          setTimeout(() => {
            watcher.stop();
            // No callbacks for node_modules
            expect(callback).not.toHaveBeenCalled();
            resolve();
          }, 800);
        }),
      5000,
    );

    it('returns a stop function', () => {
      const callback = vi.fn();
      const {stop} = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

      expect(typeof stop).toBe('function');

      // Stop should not throw
      expect(() => stop()).not.toThrow();
    });
  });
});
