import path from 'node:path';
import chokidar from 'chokidar';

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
    event: 'add' | 'change' | 'unlink',
    filePath: string,
  ) {
    if (isIgnored(filePath)) return;
    if (!matchesExtensions(filePath)) return;

    const key = `${event}:${filePath}`;
    const existingTimer = debounceTimers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(key);
      callback(event, filePath);
    }, debounceDelay);

    debounceTimers.set(key, timer);
  }

  const watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    ignored: (filePath) => isIgnored(filePath),
    persistent: true,
  });

  watcher.on('add', (filePath) => handleFileChange('add', filePath));
  watcher.on('change', (filePath) => handleFileChange('change', filePath));
  watcher.on('unlink', (filePath) => handleFileChange('unlink', filePath));

  return {
    stop: () => {
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      void watcher.close();
    },
  };
}

export function getRelativePath(dir: string, filePath: string): string {
  return path.relative(dir, filePath);
}
