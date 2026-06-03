import {useState, useRef} from 'react';
import {Box, Text, useApp} from 'ink';
import {randomUUID} from 'node:crypto';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {isDockerInstalled, isDockerRunning} from '../lib/docker.js';
import {detectTheme} from '../lib/theme.js';
import {projectConfigExists, writeProjectConfig, writeLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import type {ProjectConfig, LocalConfig, ThemeInfo} from '../types/config.js';

export const description = 'Initialize a new Kiqr project in the current directory';

export default function Init() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);
  const [themeName, setThemeName] = useState('');

  const ref = useRef<{
    theme: ThemeInfo | null;
    projectId: string;
  }>({theme: null, projectId: ''});

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
      label: 'Checking theme...',
      run: async () => {
        const detected = detectTheme();
        if (!detected) {
          throw new Error(
            'This folder does not appear to be a WordPress theme.\nMake sure you have a style.css file with a "Theme Name:" header.',
          );
        }
        ref.current.theme = detected;
        setThemeName(detected.name);
      },
    },
    {
      label: 'Checking project...',
      run: async () => {
        if (projectConfigExists()) {
          throw new Error(
            'This project is already initialized. A kiqr.yaml file already exists.',
          );
        }
      },
    },
    {
      label: 'Creating project configuration...',
      run: async () => {
        const theme = ref.current.theme!;
        ref.current.projectId = randomUUID();

        const projectConfig: ProjectConfig = {
          project_id: ref.current.projectId,
          name: theme.slug,
          wordpress: {version: 'latest', php_version: '8.3'},
          development: {dynamic_urls: true},
        };
        writeProjectConfig(projectConfig);

        const localConfig: LocalConfig = {
          project_id: ref.current.projectId,
          runtime: 'bitnami',
          db_password: randomUUID().replace(/-/g, '').slice(0, 24),
          login_secret: randomUUID().replace(/-/g, ''),
          created_at: new Date().toISOString(),
        };
        const runtimeDir = getProjectRuntimeDir(ref.current.projectId);
        writeLocalConfig(localConfig, runtimeDir);
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
          <Text bold color="green">Your project is ready!</Text>
          <Text> </Text>
          <Text>Theme: <Text bold>{themeName}</Text></Text>
          <Text> </Text>
          <Text dimColor>Run <Text bold>kiqr up</Text> to start your site.</Text>
        </Box>
      )}
    </Box>
  );
}
