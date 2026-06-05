import fs from 'node:fs';
import path from 'node:path';

export interface WatchOptions {
  extensions?: string[];
  ignored?: RegExp | string[];
}

export type FileChangeCallback = (event: 'add' | 'change' | 'unlink', filePath: string) => void;

export function createFileWatcher(
  watchDir: string,
  options: WatchOptions = {},
  callback: FileChangeCallback,
): {stop: () => void} {
  const {extensions, ignored} = options;
  const ignoredRegex = ignored
    ? Array.isArray(ignored)
      ? new RegExp(ignored.map((p) => `(?:${p})`).join('|'))
      : (ignored as RegExp)
    : null;

  const debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  const debounceDelay = 50;

  function isIgnored(filePath: string): boolean {
    if (ignoredRegex?.test(filePath)) return true;

    const relativePath = path.relative(watchDir, filePath);

    // Ignore common non-theme directories
    const ignorePatterns = [
      /node_modules/,
      /\.git/,
      /\.env/,
      /vendor/,
      /\.cache/,
    ];

    return ignorePatterns.some((pattern) => pattern.test(relativePath));
  }

  function matchesExtensions(filePath: string): boolean {
    if (!extensions || extensions.length === 0) return true;
    const ext = path.extname(filePath).toLowerCase();
    return extensions.some((e) => e.toLowerCase() === ext);
  }

  function handleFileChange(
    eventType: 'rename' | 'change',
    filePath: string,
  ) {
    if (isIgnored(filePath)) return;
    if (!matchesExtensions(filePath)) return;

    const key = `${eventType}:${filePath}`;
    const existingTimer = debounceTimers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(key);

      if (eventType === 'rename') {
        try {
          if (fs.existsSync(filePath)) {
            callback('add', filePath);
          } else {
            callback('unlink', filePath);
          }
        } catch {
          callback('unlink', filePath);
        }
      } else {
        callback('change', filePath);
      }
    }, debounceDelay);

    debounceTimers.set(key, timer);
  }

  const watcher = fs.watch(watchDir, {recursive: true}, (eventType, filename) => {
    if (!filename) return;

    const fullPath = path.join(watchDir, filename);
    handleFileChange(eventType as 'rename' | 'change', fullPath);
  });

  return {
    stop: () => {
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      watcher.close();
    },
  };
}

export function getRelativePath(dir: string, filePath: string): string {
  return path.relative(dir, filePath);
}