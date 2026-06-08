import {Box, Text, useApp} from 'ink';
import {argument} from 'pastel';
import {useEffect, useState} from 'react';
import zod from 'zod';
import {readLocalConfig, readProjectConfig, writeLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {createRuntimeProvider} from '../lib/runtime.js';
import {
  removeXdebugAssets,
  writeXdebugAssets,
  XDEBUG_CLIENT_PORT,
} from '../lib/xdebug.js';

export const description = 'Toggle Xdebug step-debugging (on/off)';

export const args = zod.tuple([
  zod.enum(['on', 'off']).describe(
    argument({
      name: 'state',
      description: 'Whether to enable or disable Xdebug step-debugging',
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

export default function Xdebug({args}: Props) {
  const {exit} = useApp();
  const [state] = args;
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let pc: ReturnType<typeof readProjectConfig>;
    try {
      pc = readProjectConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      exit(new Error());
      return;
    }
    if (!pc) {
      setError('This project is not initialized. Run "kiqr init" first.');
      exit(new Error());
      return;
    }

    const runtimeDir = getProjectRuntimeDir(pc.project_id);
    let lc: ReturnType<typeof readLocalConfig>;
    try {
      lc = readLocalConfig(runtimeDir);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      exit(new Error());
      return;
    }
    if (!lc) {
      setError('Local configuration not found. Run "kiqr init" first.');
      exit(new Error());
      return;
    }

    const turnOn = state === 'on';
    lc.xdebug = turnOn;
    writeLocalConfig(lc, runtimeDir);

    if (turnOn) {
      const provider = createRuntimeProvider(lc.runtime);
      const baseImage = provider.getWordPressImage(
        pc.wordpress.version,
        pc.wordpress.php_version,
      );
      writeXdebugAssets(runtimeDir, baseImage);
    } else {
      removeXdebugAssets(runtimeDir);
    }

    setEnabled(turnOn);
    exit();
  }, []);

  if (error) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text bold color="red">
          Could not toggle Xdebug
        </Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold color={enabled ? 'green' : 'yellow'}>
        Xdebug is now {enabled ? 'enabled' : 'disabled'}.
      </Text>
      <Text> </Text>
      <Text>
        Run <Text bold>kiqr restart</Text> to apply the change.
      </Text>
      {enabled && (
        <>
          <Text dimColor>
            The first start after enabling rebuilds the WordPress image, so it is slower
            once.
          </Text>
          <Text dimColor>
            Configure your IDE to listen for debug connections on port{' '}
            {XDEBUG_CLIENT_PORT} (VS Code: PHP Debug, "Listen for Xdebug").
          </Text>
        </>
      )}
    </Box>
  );
}
