import {Box, Text, useApp} from 'ink';
import {useState} from 'react';
import type {Step} from '../../components/StepRunner.js';
import StepRunner from '../../components/StepRunner.js';
import {AGENT_PORT, ensureAgentRunning} from '../../lib/agent.js';
import {isDockerInstalled, isDockerRunning} from '../../lib/docker.js';

export const description = 'Start the kiqr agent';

export default function AgentStart() {
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
      label: 'Starting kiqr agent...',
      run: async () => {
        ensureAgentRunning();
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
            The kiqr agent is running.
          </Text>
          <Text> </Text>
          <Text>Proxy:</Text>
          <Text bold color="cyan">
            http://localhost:{AGENT_PORT}
          </Text>
          <Text> </Text>
          <Text dimColor>
            It stays up across projects until you run "kiqr agent stop".
          </Text>
        </Box>
      )}
    </Box>
  );
}
