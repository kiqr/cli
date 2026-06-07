import fs from 'node:fs';
import path from 'node:path';
import {TextInput} from '@inkjs/ui';
import {Box, Text, useApp} from 'ink';
import {useRef, useState} from 'react';
import type {Step} from '../components/StepRunner.js';
import StepRunner from '../components/StepRunner.js';
import {readProjectConfig} from '../lib/config.js';
import {runDockerCompose} from '../lib/docker.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {stopTraefikIfIdle} from '../lib/traefik.js';
import type {ProjectConfig} from '../types/config.js';

export const description = 'Stop and remove all site data (database, uploads, etc.)';

function generateChallenge(): {a: number; b: number; answer: number} {
  const a = Math.floor(Math.random() * 40) + 10;
  const b = Math.floor(Math.random() * 40) + 10;
  return {a, b, answer: a + b};
}

export default function Destroy() {
  const {exit} = useApp();
  const [confirmed, setConfirmed] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [complete, setComplete] = useState(false);

  const ref = useRef<{
    projectConfig: ProjectConfig | null;
    challenge: {a: number; b: number; answer: number};
  }>({projectConfig: null, challenge: generateChallenge()});

  const challenge = ref.current.challenge;

  if (!confirmed) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text color="red" bold>
          This will permanently delete all site data.
        </Text>
        <Text color="red">
          Database, uploads, plugins, and configuration will be lost.
        </Text>
        <Text> </Text>
        <Text>
          To confirm, solve this:{' '}
          <Text bold color="yellow">
            What is {challenge.a} + {challenge.b}?
          </Text>
        </Text>
        <Box marginTop={1}>
          {wrong && <Text color="red">Wrong answer. </Text>}
          <Text dimColor>Answer: </Text>
          <TextInput
            onSubmit={(value) => {
              if (parseInt(value, 10) === challenge.answer) {
                setConfirmed(true);
              } else {
                setWrong(true);
                ref.current.challenge = generateChallenge();
                setTimeout(() => exit(new Error()), 100);
              }
            }}
          />
        </Box>
      </Box>
    );
  }

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
    {
      label: 'Cleaning up...',
      run: async () => {
        stopTraefikIfIdle();
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
          <Text bold color="green">
            Project destroyed.
          </Text>
          <Text dimColor>
            Run <Text bold>kiqr init</Text> to start fresh.
          </Text>
        </Box>
      )}
    </Box>
  );
}
