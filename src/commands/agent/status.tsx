import {Box, Text, useApp} from 'ink';
import {getAgentStatus} from '../../lib/agent.js';

export const description = 'Show the kiqr agent status';

export default function AgentStatus() {
  const {exit} = useApp();
  const status = getAgentStatus();

  setTimeout(() => exit(), 50);

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Kiqr Agent</Text>
      <Text>
        {' '}
        Status:{' '}
        {status.running ? (
          <Text bold color="green">
            running
          </Text>
        ) : (
          <Text bold color="red">
            stopped
          </Text>
        )}
      </Text>
      <Text>
        {' '}
        Proxy: <Text color="cyan">http://localhost:{status.port}</Text>
      </Text>
      <Text> </Text>
      <Text bold>Containers</Text>
      {status.containers.map((c) => (
        <Text key={c.name}>
          {' '}
          {c.running ? <Text color="green">●</Text> : <Text color="red">○</Text>} {c.name}{' '}
          <Text dimColor>({c.running ? 'running' : 'stopped'})</Text>
        </Text>
      ))}
    </Box>
  );
}
