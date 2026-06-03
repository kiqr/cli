import {useState, useRef} from 'react';
import {Box, Text, useApp} from 'ink';
import {ConfirmInput} from '@inkjs/ui';
import {randomUUID} from 'node:crypto';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {isDockerInstalled, isDockerRunning, runDockerCompose} from '../lib/docker.js';
import {
  readProjectConfig,
  readLocalConfig,
  writeProjectConfig,
  writeLocalConfig,
  projectConfigExists,
} from '../lib/config.js';
import {getProjectRuntimeDir, getProjectPluginsDir, getProjectUploadsDir} from '../lib/paths.js';
import {ensureTraefikRunning} from '../lib/traefik.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {detectTheme} from '../lib/theme.js';
import {writeProjectCompose} from '../lib/compose.js';
import {writeMuPlugin} from '../lib/mu-plugin.js';
import fs from 'node:fs';
import path from 'node:path';
import type {ProjectConfig, LocalConfig} from '../types/config.js';

export const description = 'Start the WordPress development environment';

export default function Up() {
  const {exit} = useApp();
  const [needsInit, setNeedsInit] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [pmaUrl, setPmaUrl] = useState('');
  const [themeName, setThemeName] = useState('');

  const ref = useRef<{
    projectConfig: ProjectConfig | null;
    localConfig: LocalConfig | null;
    runtimeDir: string;
    composePath: string;
    checked: boolean;
  }>({projectConfig: null, localConfig: null, runtimeDir: '', composePath: '', checked: false});

  if (!ref.current.checked) {
    ref.current.checked = true;
    if (!projectConfigExists()) {
      const theme = detectTheme();
      if (theme) {
        setThemeName(theme.name);
        setNeedsInit(true);
        return null;
      }
    }
  }

  if (needsInit && !confirmed) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text>
          No project configuration found, but <Text bold>{themeName}</Text> looks like a WordPress theme.
        </Text>
        <Box marginTop={1}>
          <Text>Initialize this project? </Text>
          <ConfirmInput
            onConfirm={() => setConfirmed(true)}
            onCancel={() => exit()}
          />
        </Box>
      </Box>
    );
  }

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
    ...(needsInit
      ? [
          {
            label: 'Initializing project...',
            run: async () => {
              const theme = detectTheme();
              if (!theme) {
                throw new Error('This folder does not appear to be a WordPress theme.');
              }
              const projectId = randomUUID();
              writeProjectConfig({
                project_id: projectId,
                name: theme.slug,
                wordpress: {version: 'latest', php_version: '8.3'},
                development: {dynamic_urls: true},
              });
              writeLocalConfig(
                {
                  project_id: projectId,
                  runtime: 'bitnami',
                  db_password: randomUUID().replace(/-/g, '').slice(0, 24),
                  login_secret: randomUUID().replace(/-/g, ''),
                  created_at: new Date().toISOString(),
                },
                getProjectRuntimeDir(projectId),
              );
            },
          },
        ]
      : []),
    {
      label: 'Loading project...',
      run: async () => {
        const pc = readProjectConfig();
        if (!pc) {
          throw new Error('This project is not initialized.\nRun "kiqr init" first.');
        }
        ref.current.projectConfig = pc;
        ref.current.runtimeDir = getProjectRuntimeDir(pc.project_id);
        ref.current.composePath = path.join(ref.current.runtimeDir, 'compose.yaml');

        const lc = readLocalConfig(ref.current.runtimeDir);
        if (!lc) {
          throw new Error('Local configuration not found.\nRun "kiqr init" first.');
        }
        ref.current.localConfig = lc;
      },
    },
    {
      label: 'Preparing site...',
      run: async () => {
        const pc = ref.current.projectConfig!;
        const lc = ref.current.localConfig!;
        const theme = detectTheme();
        if (!theme) {
          throw new Error('This folder does not appear to be a WordPress theme.');
        }

        const hostname = buildProjectHostname(pc.name);
        const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');
        const muPluginPath = writeMuPlugin(ref.current.runtimeDir);
        const pluginsPath = getProjectPluginsDir(pc.project_id);
        const uploadsPath = getProjectUploadsDir(pc.project_id);
        fs.mkdirSync(pluginsPath, {recursive: true});
        fs.mkdirSync(uploadsPath, {recursive: true});

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
            pluginsPath,
            uploadsPath,
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
          <Text> </Text>
          <Text dimColor>WordPress may take a minute to fully start on first run.</Text>
        </Box>
      )}
    </Box>
  );
}
