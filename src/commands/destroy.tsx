import {useState, useRef} from 'react';
import {Box, Text, useApp} from 'ink';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {runDockerCompose} from '../lib/docker.js';
import {readProjectConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import path from 'node:path';
import fs from 'node:fs';
import type {ProjectConfig} from '../types/config.js';

export const description = 'Stop and remove all site data (database, uploads, etc.)';

export default function Destroy() {
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
      label: 'Stopping and removing site data...',
      run: async () => {
        const runtimeDir = getProjectRuntimeDir(ref.current.projectConfig!.project_id);
        const composePath = path.join(runtimeDir, 'compose.yaml');
        try {
          runDockerCompose(composePath, 'down', ['-v']);
        } catch {
          // Services may not be running
        }
      },
    },
    {
      label: 'Cleaning up local files...',
      run: async () => {
        const runtimeDir = getProjectRuntimeDir(ref.current.projectConfig!.project_id);
        fs.rmSync(runtimeDir, {recursive: true, force: true});
      },
    },
    {
      label: 'Removing project configuration...',
      run: async () => {
        const kiqrYaml = path.join(process.cwd(), 'kiqr.yaml');
        if (fs.existsSync(kiqrYaml)) {
          fs.unlinkSync(kiqrYaml);
        }
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
          <Text bold color="green">Project destroyed.</Text>
          <Text dimColor>Run <Text bold>kiqr init</Text> to start fresh.</Text>
        </Box>
      )}
    </Box>
  );
}
