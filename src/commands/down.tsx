import {useState, useRef} from 'react';
import {Box, Text, useApp} from 'ink';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {runDockerCompose} from '../lib/docker.js';
import {readProjectConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import path from 'node:path';
import type {ProjectConfig} from '../types/config.js';

export const description = 'Stop the WordPress development environment';

export default function Down() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);

  const ref = useRef<{projectConfig: ProjectConfig | null}>({projectConfig: null});

  const steps: Step[] = [
    {
      label: 'Loading project...',
      run: async () => {
        const pc = readProjectConfig();
        if (!pc) {
          throw new Error(
            'This project is not initialized.\nRun "kiqr init" first to set up your project.',
          );
        }
        ref.current.projectConfig = pc;
      },
    },
    {
      label: 'Stopping WordPress and database...',
      run: async () => {
        const runtimeDir = getProjectRuntimeDir(ref.current.projectConfig!.project_id);
        const composePath = path.join(runtimeDir, 'compose.yaml');
        runDockerCompose(composePath, 'down');
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
        onError={() => {
          setTimeout(() => exit(new Error()), 100);
        }}
      />
      {complete && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">Your site has been stopped.</Text>
        </Box>
      )}
    </Box>
  );
}
