import {Box, Text, useApp} from 'ink';
import {useState} from 'react';
import type {Step} from '../../components/StepRunner.js';
import StepRunner from '../../components/StepRunner.js';
import {stopAgent} from '../../lib/agent.js';

export const description = 'Stop the kiqr agent';

export default function AgentStop() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);

  const steps: Step[] = [
    {
      label: 'Stopping kiqr agent...',
      run: async () => {
        stopAgent();
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
            The kiqr agent has been stopped.
          </Text>
          <Text dimColor>It will start again on your next "kiqr up".</Text>
        </Box>
      )}
    </Box>
  );
}
