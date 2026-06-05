import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {createFileWatcher, getRelativePath} from '../../src/lib/watch.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
      const result = getRelativePath('/project/theme', '/project/theme/src/components/Header.php');
      expect(result).toBe('src/components/Header.php');
    });
  });

  describe('createFileWatcher', () => {
    it('reports file changes', () => new Promise((resolve) => {
      const callback = vi.fn();
      const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

      // Create a test file
      const testFile = path.join(tempDir, 'test.php');
      fs.writeFileSync(testFile, '<?php // test');

      // Give it time to detect the change
      setTimeout(() => {
        watcher.stop();
        // At least one callback should have been called (add or change)
        expect(callback.mock.calls.length).toBeGreaterThan(0);
        resolve();
      }, 200);
    }));

    it('ignores files without matching extensions', () => new Promise((resolve) => {
      const callback = vi.fn();
      const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

      // Create a non-matching file
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');

      setTimeout(() => {
        watcher.stop();
        // No callbacks should have been called for .txt files
        expect(callback).not.toHaveBeenCalled();
        resolve();
      }, 200);
    }));

    it('ignores node_modules directories', () => new Promise((resolve) => {
      const callback = vi.fn();
      const watcher = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

      // Create a file in node_modules
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir, {recursive: true});
      const testFile = path.join(nodeModulesDir, 'test.php');
      fs.writeFileSync(testFile, '<?php // test');

      setTimeout(() => {
        watcher.stop();
        // No callbacks for node_modules
        expect(callback).not.toHaveBeenCalled();
        resolve();
      }, 200);
    }));

    it('returns a stop function', () => {
      const callback = vi.fn();
      const {stop} = createFileWatcher(tempDir, {extensions: ['.php']}, callback);

      expect(typeof stop).toBe('function');

      // Stop should not throw
      expect(() => stop()).not.toThrow();
    });
  });
});