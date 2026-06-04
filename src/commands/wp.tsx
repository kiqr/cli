import {useEffect} from 'react';
import {Box, Text, useApp} from 'ink';
import {execSync} from 'node:child_process';
import zod from 'zod';
import {argument} from 'pastel';
import {readProjectConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import path from 'node:path';

export const description = 'Run a WP-CLI command';

export const args = zod.tuple([]).rest(
  zod.string().describe(
    argument({
      name: 'args',
      description: 'WP-CLI command and arguments',
    }),
  ),
);

type Props = {
  args: zod.infer<typeof args>;
};

export default function Wp({}: Props) {
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

    // Grab everything after "wp" from the raw process args
    const wpIndex = process.argv.indexOf('wp');
    const rawArgs = wpIndex >= 0 ? process.argv.slice(wpIndex + 1) : [];

    if (rawArgs.length === 0) {
      execSync(
        `docker compose -f "${composePath}" run --rm wpcli --help`,
        {stdio: 'inherit'},
      );
      exit();
      return;
    }

    try {
      execSync(
        `docker compose -f "${composePath}" run --rm wpcli ${rawArgs.join(' ')}`,
        {stdio: 'inherit'},
      );
    } catch {
      // WP-CLI exits with non-zero for errors — already printed to stderr
    }

    exit();
  }, []);

  return (
    <Box>
      <Text dimColor>Running WP-CLI...</Text>
    </Box>
  );
}
