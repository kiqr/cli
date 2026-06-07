import {Box, Text, useApp} from 'ink';
import {useState} from 'react';
import type {Step} from '../../components/StepRunner.js';
import StepRunner from '../../components/StepRunner.js';
import {AGENT_PORT, restartAgent} from '../../lib/agent.js';
import {isDockerInstalled, isDockerRunning} from '../../lib/docker.js';

export const description = 'Restart the kiqr agent';

export default function AgentRestart() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);

  const steps: Step[] = [
    {
      label: 'Checking Docker...',
      run: async () => {
        if (!isDockerInstalled()) {
          throw new Error(
            'Docker is not installed. Please install Docker Desktop from https://docker.com',
          );
        }
        if (!isDockerRunning()) {
          throw new Error(
            'Docker is not running. Please start Docker Desktop and try again.',
          );
        }
      },
    },
    {
      label: 'Restarting kiqr agent...',
      run: async () => {
        restartAgent();
      },
    },
  ];

  return (
    <Box flexDirection="column">
      <StepRunner
        steps={steps}
        onComplete={() => {
          setComplete(true);
          setTimeout(() => exit(), 100);
        }}
        onError={() => setTimeout(() => exit(new Error()), 100)}
      />
      {complete && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">
            The kiqr agent has been restarted.
          </Text>
          <Text> </Text>
          <Text>Proxy:</Text>
          <Text bold color="cyan">
            http://localhost:{AGENT_PORT}
          </Text>
        </Box>
      )}
    </Box>
  );
}
