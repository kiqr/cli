export const COMPLETION_SHELLS = ['bash', 'zsh', 'fish'] as const;

export type CompletionShell = (typeof COMPLETION_SHELLS)[number];

/**
 * Stable, top-level kiqr subcommands offered by shell completion.
 *
 * This is a hardcoded list rather than auto-discovery so that the generated
 * completion script is deterministic and does not depend on the CLI being
 * able to run (the user's shell sources it on startup).
 */
export const KIQR_COMMANDS = [
  'up',
  'down',
  'restart',
  'init',
  'info',
  'open',
  'logs',
  'wp',
  'watch',
  'destroy',
  'doctor',
  'db',
] as const;

/**
 * Type guard for validating an arbitrary string against the supported shells.
 */
export function isCompletionShell(value: string): value is CompletionShell {
  return (COMPLETION_SHELLS as readonly string[]).includes(value);
}

function generateBash(commands: string[]): string {
  const wordList = commands.join(' ');
  return `# kiqr bash completion
# Install: kiqr completion bash >> ~/.bashrc
_kiqr_completion() {
  local cur cmds
  cur="\${COMP_WORDS[COMP_CWORD]}"
  cmds="${wordList}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )
  fi
  return 0
}
complete -F _kiqr_completion kiqr
`;
}

function generateZsh(commands: string[]): string {
  const lines = commands.map((c) => `    '${c}'`).join(' \\\n');
  return `#compdef kiqr
# kiqr zsh completion
# Install: kiqr completion zsh > "\${fpath[1]}/_kiqr"
_kiqr() {
  local -a commands
  commands=(
${lines}
  )
  if (( CURRENT == 2 )); then
    compadd -- \${commands}
  fi
}
compdef _kiqr kiqr
`;
}

function generateFish(commands: string[]): string {
  const lines = commands
    .map((c) => `complete -c kiqr -n '__fish_use_subcommand' -f -a '${c}'`)
    .join('\n');
  return `# kiqr fish completion
# Install: kiqr completion fish > ~/.config/fish/completions/kiqr.fish
${lines}
`;
}

/**
 * Generate an idiomatic shell completion script for `kiqr`.
 *
 * The returned script completes the given top-level subcommand names directly
 * after `kiqr` (i.e. the first argument).
 */
export function generateCompletion(shell: CompletionShell, commands: string[]): string {
  switch (shell) {
    case 'bash':
      return generateBash(commands);
    case 'zsh':
      return generateZsh(commands);
    case 'fish':
      return generateFish(commands);
    default: {
      // Exhaustiveness guard: if a new shell is added to the union without a
      // matching branch, TypeScript flags this and we fail loudly at runtime.
      const _exhaustive: never = shell;
      throw new Error(`Unsupported shell: ${String(_exhaustive)}`);
    }
  }
}
