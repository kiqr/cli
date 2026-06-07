import {execSync} from 'node:child_process';
import path from 'node:path';
import {Box, Text, useApp} from 'ink';
import {useEffect} from 'react';
import {readProjectConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';

export const description = 'Show WordPress logs';

export default function Logs() {
  const {exit} = useApp();

  useEffect(() => {
    const pc = readProjectConfig();
    if (!pc) {
      console.error('This project is not initialized. Run "kiqr init" first.');
      exit(new Error());
      return;
    }

    const runtimeDir = getProjectRuntimeDir(pc.project_id);
    const composePath = path.join(runtimeDir, 'compose.yaml');

    try {
      execSync(`docker compose -f "${composePath}" logs -f wordpress`, {
        stdio: 'inherit',
      });
    } catch {
      // User pressed Ctrl+C or container stopped
    }

    exit();
  }, []);

  return (
    <Box>
      <Text dimColor>Loading logs...</Text>
    </Box>
  );
}
