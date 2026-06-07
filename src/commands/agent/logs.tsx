import {execSync} from 'node:child_process';
import {Box, Text, useApp} from 'ink';
import {useEffect} from 'react';
import {writeAgentCompose} from '../../lib/agent.js';

export const description = 'Stream the kiqr agent logs';

export default function AgentLogs() {
  const {exit} = useApp();

  useEffect(() => {
    const composePath = writeAgentCompose();

    try {
      execSync(`docker compose -f "${composePath}" logs -f`, {
        stdio: 'inherit',
      });
    } catch {
      // User pressed Ctrl+C or the agent is not running
    }

    exit();
  }, []);

  return (
    <Box>
      <Text dimColor>Loading agent logs...</Text>
    </Box>
  );
}
