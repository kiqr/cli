import {Box, Text} from 'ink';

export const description = 'Manage the kiqr agent (shared background service)';

export default function AgentIndex() {
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Kiqr Agent</Text>
      <Text dimColor>The shared background service powering every kiqr project</Text>
      <Text> </Text>
      <Text>Commands:</Text>
      <Text>
        {' '}
        <Text bold>kiqr agent start</Text> Start the agent
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr agent stop</Text> Stop the agent
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr agent restart</Text> Restart the agent
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr agent status</Text> Show whether the agent is running
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr agent logs</Text> Stream the agent container logs
      </Text>
    </Box>
  );
}
