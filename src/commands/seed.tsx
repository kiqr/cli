import {existsSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {Box, Text, useApp} from 'ink';
import {option} from 'pastel';
import {useEffect, useState} from 'react';
import zod from 'zod';
import {generateSeedWxr, SEED_PRESETS, type SeedPreset} from '../lib/seed.js';

export const description = 'Generate realistic WordPress demo content as a WXR file';

export const options = zod.object({
  preset: zod
    .enum(SEED_PRESETS)
    .default('blog')
    .describe(
      option({
        description: 'Which demo content set to generate',
        alias: 'p',
        valueDescription: SEED_PRESETS.join('|'),
      }),
    ),
});

type Props = {
  options: zod.infer<typeof options>;
};

type Result =
  | {kind: 'done'; preset: SeedPreset; filename: string}
  | {kind: 'error'; message: string};

export default function Seed({options}: Props) {
  const {exit} = useApp();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const preset = options.preset;
    const filename = `kiqr-seed-${preset}.xml`;
    const target = path.join(process.cwd(), filename);

    if (existsSync(target)) {
      setResult({
        kind: 'error',
        message: `${filename} already exists. Remove it or move it before running "kiqr seed" again.`,
      });
      setTimeout(() => exit(new Error()), 100);
      return;
    }

    try {
      writeFileSync(target, generateSeedWxr(preset), 'utf8');
      setResult({kind: 'done', preset, filename});
      setTimeout(() => exit(), 100);
    } catch (err) {
      setResult({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
      setTimeout(() => exit(new Error()), 100);
    }
  }, []);

  if (!result) return <Text dimColor>Generating demo content...</Text>;

  if (result.kind === 'error') return <Text color="red">{result.message}</Text>;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="green">
        Wrote {result.filename} ({result.preset} preset).
      </Text>
      <Text> </Text>
      <Text>Next steps:</Text>
      <Text> </Text>
      <Text dimColor> 1. Make sure your site is running: </Text>
      <Text>
        {'    '}
        <Text bold>kiqr up</Text>
      </Text>
      <Text dimColor> 2. Import the demo content:</Text>
      <Text>
        {'    '}
        <Text bold>kiqr wp import {result.filename} --authors=create</Text>
      </Text>
    </Box>
  );
}
