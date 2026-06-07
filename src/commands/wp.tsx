import path from 'node:path';
import {Box, Text, useApp} from 'ink';
import {argument} from 'pastel';
import {useEffect} from 'react';
import zod from 'zod';
import {readProjectConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {runWpCliInherit} from '../lib/wpcli.js';

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

export default function Wp(_props: Props) {
  const {exit} = useApp();

  useEffect(() => {
    let pc: ReturnType<typeof readProjectConfig>;
    try {
      pc = readProjectConfig();
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      exit(new Error());
      return;
    }
    if (!pc) {
      console.error('This project is not initialized. Run "kiqr init" first.');
      exit(new Error());
      return;
    }

    const runtimeDir = getProjectRuntimeDir(pc.project_id);
    const composePath = path.join(runtimeDir, 'compose.yaml');

    // Grab everything after "wp" from the raw process args. Each element is a
    // single argument, so values with spaces/quotes (e.g.
    // --post_title="Hello World") are preserved when passed as an array.
    const wpIndex = process.argv.indexOf('wp');
    const rawArgs = wpIndex >= 0 ? process.argv.slice(wpIndex + 1) : [];
    const wpArgs = rawArgs.length === 0 ? ['--help'] : rawArgs;

    // Use the array-based, shell-free spawn so arguments are passed verbatim.
    // WP-CLI exits non-zero on errors, which it has already printed to stderr.
    runWpCliInherit(composePath, wpArgs);

    exit();
  }, []);

  return (
    <Box>
      <Text dimColor>Running WP-CLI...</Text>
    </Box>
  );
}
