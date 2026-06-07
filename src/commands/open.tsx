import {execSync} from 'node:child_process';
import {Box, Text, useApp} from 'ink';
import {argument} from 'pastel';
import {useEffect} from 'react';
import zod from 'zod';
import {readLocalConfig, readProjectConfig} from '../lib/config.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {
  getProjectPluginsDir,
  getProjectRuntimeDir,
  getProjectUploadsDir,
} from '../lib/paths.js';

export const description = 'Open a site URL or folder in your browser/explorer';

export const args = zod.tuple([
  zod
    .string()
    .optional()
    .describe(
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
    let pc: ReturnType<typeof readProjectConfig>;
    try {
      pc = readProjectConfig();
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      exit(new Error());
      return;
    }
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
    let lc: ReturnType<typeof readLocalConfig>;
    try {
      lc = readLocalConfig(runtimeDir);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      exit(new Error());
      return;
    }
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
