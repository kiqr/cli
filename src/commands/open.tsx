import {useEffect} from 'react';
import {Box, Text, useApp} from 'ink';
import {execSync} from 'node:child_process';
import zod from 'zod';
import {argument} from 'pastel';
import {readProjectConfig, readLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir, getProjectPluginsDir, getProjectUploadsDir} from '../lib/paths.js';
import {buildProjectHostname} from '../lib/hostname.js';

export const description = 'Open a site URL or folder in your browser/explorer';

export const args = zod.tuple([
  zod.string().optional().describe(
    argument({
      name: 'app',
      description:
        'What to open (default: wp)\n\n' +
        '  wp, wordpress, web        Open the site\n' +
        '  admin, wpadmin, dashboard  Open the WordPress dashboard (auto-login)\n' +
        '  phpmyadmin, pma            Open phpMyAdmin (auto-login)\n' +
        '  plugins                    Open the plugins folder\n' +
        '  uploads, media             Open the uploads folder\n' +
        '  data                       Open the Kiqr project data folder',
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

const ALIASES: Record<string, string> = {
  wp: 'wp',
  wordpress: 'wp',
  web: 'wp',
  phpmyadmin: 'phpmyadmin',
  pma: 'phpmyadmin',
  admin: 'admin',
  wpadmin: 'admin',
  dashboard: 'admin',
  plugins: 'plugins',
  uploads: 'uploads',
  media: 'uploads',
  data: 'data',
};

function openTarget(target: string): void {
  const openCmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';

  execSync(`${openCmd} "${target}"`, {stdio: 'pipe'});
}

export default function Open({args}: Props) {
  const {exit} = useApp();
  const [appArg] = args;

  useEffect(() => {
    const pc = readProjectConfig();
    if (!pc) {
      console.error('This project is not initialized. Run "kiqr init" first.');
      exit(new Error());
      return;
    }

    const key = ALIASES[(appArg ?? 'wp').toLowerCase()];
    if (!key) {
      console.error(
        `Unknown target "${appArg}". Run "kiqr open --help" to see available targets.`,
      );
      exit(new Error());
      return;
    }

    const runtimeDir = getProjectRuntimeDir(pc.project_id);
    const lc = readLocalConfig(runtimeDir);
    const hostname = buildProjectHostname(pc.name);
    const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');

    try {
      switch (key) {
        case 'wp':
          openTarget(`http://${hostname}:5477`);
          break;
        case 'phpmyadmin':
          openTarget(`http://${phpMyAdminHostname}:5477`);
          break;
        case 'admin':
          if (lc?.login_secret) {
            openTarget(`http://${hostname}:5477/wp-admin?kiqr_login=${lc.login_secret}`);
          } else {
            openTarget(`http://${hostname}:5477/wp-admin`);
          }
          break;
        case 'plugins':
          openTarget(getProjectPluginsDir(pc.project_id));
          break;
        case 'uploads':
          openTarget(getProjectUploadsDir(pc.project_id));
          break;
        case 'data':
          openTarget(runtimeDir);
          break;
      }
    } catch {
      console.error('Could not open target. Is the site running?');
    }

    exit();
  }, []);

  return (
    <Box>
      <Text dimColor>Opening...</Text>
    </Box>
  );
}
