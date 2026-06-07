import {Text} from 'ink';
import {argument} from 'pastel';
import zod from 'zod';
import {
  COMPLETION_SHELLS,
  generateCompletion,
  isCompletionShell,
  KIQR_COMMANDS,
} from '../lib/completion.js';

export const description = 'Print a shell completion script (bash/zsh/fish)';

export const args = zod.tuple([
  zod.enum(COMPLETION_SHELLS).describe(
    argument({
      name: 'shell',
      description: `Shell to generate completion for (${COMPLETION_SHELLS.join(', ')})`,
    }),
  ),
]);

type Props = {args: zod.infer<typeof args>};

export default function Completion({args}: Props) {
  const shell = args[0];

  // zod already validates against COMPLETION_SHELLS, but guard defensively so a
  // bad value produces a clear message instead of an opaque crash.
  if (!isCompletionShell(shell)) {
    return (
      <Text color="red">
        Unsupported shell "{shell}". Supported shells: {COMPLETION_SHELLS.join(', ')}.
      </Text>
    );
  }

  // Print the raw script to stdout so it can be piped/redirected:
  //   kiqr completion bash >> ~/.bashrc
  const script = generateCompletion(shell, [...KIQR_COMMANDS]);
  return <Text>{script}</Text>;
}
