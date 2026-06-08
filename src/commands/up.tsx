import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {ConfirmInput} from '@inkjs/ui';
import {Box, Text, useApp} from 'ink';
import {useRef, useState} from 'react';
import type {Step} from '../components/StepRunner.js';
import StepRunner from '../components/StepRunner.js';
import {ensureAgentRunning} from '../lib/agent.js';
import {writeApacheConf} from '../lib/apache-conf.js';
import {writeProjectCompose} from '../lib/compose.js';
import {
  projectConfigExists,
  readLocalConfig,
  readProjectConfig,
  writeLocalConfig,
  writeProjectConfig,
} from '../lib/config.js';
import {
  isDockerInstalled,
  isDockerRunning,
  removeDockerVolume,
  runDockerCompose,
} from '../lib/docker.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {validateWordPressPhp} from '../lib/image-tags.js';
import {writeMuPlugin} from '../lib/mu-plugin.js';
import {
  getProjectPluginsDir,
  getProjectRuntimeDir,
  getProjectUploadsDir,
} from '../lib/paths.js';
import {detectTheme} from '../lib/theme.js';
import type {LocalConfig, ProjectConfig} from '../types/config.js';

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
  }>({
    projectConfig: null,
    localConfig: null,
    runtimeDir: '',
    composePath: '',
    checked: false,
  });

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
          No project configuration found, but <Text bold>{themeName}</Text> looks like a
          WordPress theme.
        </Text>
        <Box marginTop={1}>
          <Text>Initialize this project? </Text>
          <ConfirmInput onConfirm={() => setConfirmed(true)} onCancel={() => exit()} />
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
        const apacheConfPath = writeApacheConf(ref.current.runtimeDir);
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
            wordpressVersion: pc.wordpress.version,
            phpVersion: pc.wordpress.php_version,
            dbPassword: lc.db_password,
            loginSecret: lc.login_secret,
            muPluginPath,
            apacheConfPath,
            pluginsPath,
            uploadsPath,
            dataDir: ref.current.runtimeDir,
          },
          ref.current.runtimeDir,
        );
      },
    },
    {
      label: 'Starting kiqr agent...',
      run: async () => {
        ensureAgentRunning();
      },
    },
    {
      label: 'Checking WordPress version...',
      run: async () => {
        const pc = ref.current.projectConfig!;
        const lc = ref.current.localConfig!;
        const requestedVersion = pc.wordpress.version;
        const runningVersion = lc.wordpress_version;

        if (runningVersion && runningVersion !== requestedVersion) {
          // Stop containers so the volume is released
          try {
            runDockerCompose(ref.current.composePath, 'down');
          } catch {
            // May not be running
          }
          // Now safe to remove the WordPress core volume
          removeDockerVolume(`${pc.project_id}_wordpress_data`);
        }

        // Track the version
        if (lc.wordpress_version !== requestedVersion) {
          lc.wordpress_version = requestedVersion;
          writeLocalConfig(lc, ref.current.runtimeDir);
        }
      },
    },
    {
      label: 'Validating WordPress + PHP version...',
      run: async () => {
        const pc = ref.current.projectConfig!;
        const check = await validateWordPressPhp(
          pc.wordpress.version,
          pc.wordpress.php_version,
        );
        if (!check.ok) {
          throw new Error(check.message);
        }
      },
    },
    {
      label: 'Starting WordPress and database...',
      run: async () => {
        runDockerCompose(ref.current.composePath, 'up', ['-d', '--pull', 'always']);
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
            Your site is ready!
          </Text>
          <Text> </Text>
          <Text>Site:</Text>
          <Text bold color="cyan">
            {siteUrl}
          </Text>
          <Text> </Text>
          <Text>phpMyAdmin:</Text>
          <Text bold color="cyan">
            {pmaUrl}
          </Text>
          <Text> </Text>
          <Text dimColor>WordPress may take a minute to fully start on first run.</Text>
        </Box>
      )}
    </Box>
  );
}
