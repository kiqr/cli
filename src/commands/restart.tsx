import {useState, useRef} from 'react';
import {Box, Text, useApp} from 'ink';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {isDockerInstalled, isDockerRunning, runDockerCompose} from '../lib/docker.js';
import {readProjectConfig, readLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {ensureTraefikRunning} from '../lib/traefik.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {detectTheme} from '../lib/theme.js';
import {writeProjectCompose} from '../lib/compose.js';
import {writeMuPlugin} from '../lib/mu-plugin.js';
import path from 'node:path';
import type {ProjectConfig, LocalConfig} from '../types/config.js';

export const description = 'Restart the WordPress development environment';

export default function Restart() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [pmaUrl, setPmaUrl] = useState('');

  const ref = useRef<{
    projectConfig: ProjectConfig | null;
    localConfig: LocalConfig | null;
    runtimeDir: string;
    composePath: string;
  }>({projectConfig: null, localConfig: null, runtimeDir: '', composePath: ''});

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
      label: 'Loading project...',
      run: async () => {
        const pc = readProjectConfig();
        if (!pc) {
          throw new Error(
            'This project is not initialized.\nRun "kiqr init" first to set up your project.',
          );
        }
        ref.current.projectConfig = pc;
        ref.current.runtimeDir = getProjectRuntimeDir(pc.project_id);
        ref.current.composePath = path.join(ref.current.runtimeDir, 'compose.yaml');

        const lc = readLocalConfig(ref.current.runtimeDir);
        if (!lc) {
          throw new Error(
            'Local configuration not found.\nRun "kiqr init" to set up this project on this machine.',
          );
        }
        ref.current.localConfig = lc;
      },
    },
    {
      label: 'Stopping services...',
      run: async () => {
        try {
          runDockerCompose(ref.current.composePath, 'down');
        } catch {
          // Services may not be running
        }
      },
    },
    {
      label: 'Preparing site...',
      run: async () => {
        const pc = ref.current.projectConfig!;
        const theme = detectTheme();
        if (!theme) {
          throw new Error(
            'This folder does not appear to be a WordPress theme.\nMake sure you have a style.css file with a "Theme Name:" header.',
          );
        }

        const lc = ref.current.localConfig!;
        const hostname = buildProjectHostname(pc.name);
        const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');
        const muPluginPath = writeMuPlugin(ref.current.runtimeDir);

        setSiteUrl(`http://${hostname}:5477`);
        setPmaUrl(`http://${phpMyAdminHostname}:5477`);

        writeProjectCompose(
          {
            projectSlug: pc.name,
            themePath: theme.path,
            themeSlug: theme.slug,
            hostname,
            phpMyAdminHostname,
            dbPassword: lc.db_password,
            loginSecret: lc.login_secret,
            muPluginPath,
            dataDir: ref.current.runtimeDir,
          },
          ref.current.runtimeDir,
        );
      },
    },
    {
      label: 'Starting reverse proxy...',
      run: async () => {
        ensureTraefikRunning();
      },
    },
    {
      label: 'Starting WordPress and database...',
      run: async () => {
        runDockerCompose(ref.current.composePath, 'up', ['-d']);
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
          <Text bold color="green">Your site is ready!</Text>
          <Text> </Text>
          <Text>Site:</Text>
          <Text bold color="cyan">{siteUrl}</Text>
          <Text> </Text>
          <Text>phpMyAdmin:</Text>
          <Text bold color="cyan">{pmaUrl}</Text>
        </Box>
      )}
    </Box>
  );
}
