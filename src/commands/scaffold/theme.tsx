import path from 'node:path';
import {Box, Text, useApp} from 'ink';
import {argument, option} from 'pastel';
import {useEffect, useState} from 'react';
import zod from 'zod';
import {generateTheme, writeTheme} from '../../lib/scaffold.js';
import {slugify} from '../../lib/theme.js';

export const description = 'Scaffold a new WordPress theme in a new directory';

export const args = zod.tuple([
  zod.string().describe(
    argument({
      name: 'name',
      description: 'Human-readable theme name (e.g. "My Cool Theme")',
    }),
  ),
]);

export const options = zod.object({
  type: zod
    .enum(['block', 'classic'])
    .default('block')
    .describe(
      option({
        description: 'Theme type: "block" (Full Site Editing) or "classic"',
        alias: 't',
      }),
    ),
  author: zod
    .string()
    .optional()
    .describe(option({description: 'Theme author name'})),
});

type Props = {
  args: zod.infer<typeof args>;
  options: zod.infer<typeof options>;
};

export default function ScaffoldTheme({args, options}: Props) {
  const {exit} = useApp();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    slug: string;
    targetDir: string;
    files: string[];
    type: 'block' | 'classic';
  } | null>(null);

  useEffect(() => {
    const name = args[0].trim();
    if (!name) {
      setError('Theme name cannot be empty.');
      setTimeout(() => exit(new Error()), 100);
      return;
    }

    const slug = slugify(name);
    if (!slug) {
      setError(
        `Could not derive a valid theme slug from "${name}". Use letters or numbers.`,
      );
      setTimeout(() => exit(new Error()), 100);
      return;
    }

    const targetDir = path.join(process.cwd(), slug);

    try {
      const files = generateTheme({
        name,
        slug,
        type: options.type,
        author: options.author,
      });
      writeTheme(targetDir, files);
      setResult({
        slug,
        targetDir,
        files: Object.keys(files).sort(),
        type: options.type,
      });
      setTimeout(() => exit(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => exit(new Error()), 100);
    }
  }, []);

  if (error) return <Text color="red">{error}</Text>;
  if (!result) return <Text dimColor>Scaffolding theme...</Text>;

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold color="green">
        Created {result.type} theme "{args[0]}"!
      </Text>
      <Text> </Text>
      <Text>
        Location: <Text bold>{result.slug}/</Text>
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {result.files.map((file) => (
          <Text key={file} dimColor>
            {'  '}
            {result.slug}/{file}
          </Text>
        ))}
      </Box>
      <Text> </Text>
      <Text dimColor>Next steps:</Text>
      <Text>
        {'  '}
        <Text bold>cd {result.slug}</Text>
      </Text>
      <Text>
        {'  '}
        <Text bold>kiqr init</Text> &amp;&amp; <Text bold>kiqr up</Text>
      </Text>
    </Box>
  );
}
