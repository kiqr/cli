import {Box, Text} from 'ink';
import {useEffect, useRef, useState} from 'react';
import {readProjectConfig} from '../lib/config.js';
import {LiveReloadServer} from '../lib/livereload.js';
import {detectTheme} from '../lib/theme.js';
import {createFileWatcher, getRelativePath} from '../lib/watch.js';

export const description = 'Watch theme files and auto-reload the browser';

interface FileChange {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export default function Watch() {
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [connected, setConnected] = useState(0);
  const [lrPort] = useState(35729);

  const watcherRef = useRef<{stop: () => void} | null>(null);
  const liveReloadRef = useRef<LiveReloadServer | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startWatch() {
      let pc: ReturnType<typeof readProjectConfig>;
      try {
        pc = readProjectConfig();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return;
      }
      if (!pc) {
        setError('This project is not initialized. Run "kiqr init" first.');
        return;
      }

      const theme = detectTheme();
      if (!theme) {
        setError('This folder does not appear to be a WordPress theme.');
        return;
      }

      try {
        // Start LiveReload server
        const lr = new LiveReloadServer({port: lrPort});
        await lr.start();
        liveReloadRef.current = lr;

        if (!mounted) {
          lr.stop();
          return;
        }

        // Start file watcher
        const watcher = createFileWatcher(
          theme.path,
          {
            extensions: [
              '.php',
              '.css',
              '.js',
              '.scss',
              '.sass',
              '.less',
              '.html',
              '.txt',
            ],
          },
          (eventType, filePath) => {
            const relativePath = getRelativePath(theme.path, filePath);
            const change: FileChange = {
              type: eventType,
              path: relativePath,
              timestamp: new Date(),
            };

            setChanges((prev) => [...prev.slice(-49), change]);

            // Determine what kind of reload to trigger
            const ext = filePath.toLowerCase();
            if (ext.endsWith('.css')) {
              lr.reloadCSS();
            } else {
              lr.reload();
            }
          },
        );

        watcherRef.current = watcher;
        setIsWatching(true);

        // Poll connected clients periodically
        pollIntervalRef.current = setInterval(() => {
          setConnected(lr.getClientsCount());
        }, 1000);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    }

    startWatch();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      watcherRef.current?.stop();
      liveReloadRef.current?.stop();
    };
  }, []);

  if (error) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text bold color="red">
          Error
        </Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press any key to exit...</Text>
        </Box>
      </Box>
    );
  }

  if (!isWatching) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text>Starting file watcher...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Box flexDirection="column">
        <Text bold color="green">
          Watching for file changes
        </Text>
        <Text dimColor>Browser will auto-reload on changes</Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          LiveReload: <Text color="cyan">localhost:{lrPort}</Text>
          {' | '}
          Connected: <Text color="yellow">{connected}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Recent changes:</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {changes.length === 0 ? (
          <Text dimColor>Waiting for changes...</Text>
        ) : (
          changes
            .slice(-10)
            .reverse()
            .map((change, i) => (
              <Text key={`${change.path}-${change.timestamp.getTime()}-${i}`}>
                <Text dimColor>[{change.timestamp.toLocaleTimeString()}]</Text>{' '}
                <Text color={change.type === 'unlink' ? 'red' : 'green'}>
                  [{change.type}]
                </Text>{' '}
                {change.path}
              </Text>
            ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to stop</Text>
      </Box>
    </Box>
  );
}
