import {useEffect} from 'react';
import {Box, Text, useApp} from 'ink';
import {execSync} from 'node:child_process';
import zod from 'zod';
import {argument} from 'pastel';
import {readProjectConfig, readLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {buildProjectHostname} from '../lib/hostname.js';

export const description = 'Open a site URL in your browser';

export const args = zod.tuple([
  zod.string().optional().describe(
    argument({
      name: 'app',
      description:
        'What to open (default: wp)\n\n' +
        '  wp, wordpress, web        Open the site\n' +
        '  admin, wpadmin, dashboard  Open the WordPress dashboard (auto-login)\n' +
        '  phpmyadmin, pma            Open phpMyAdmin (auto-login)',
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
};

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
        `Unknown app "${appArg}". Available: wp, phpmyadmin, admin`,
      );
      exit(new Error());
      return;
    }

    const runtimeDir = getProjectRuntimeDir(pc.project_id);
    const lc = readLocalConfig(runtimeDir);
    const hostname = buildProjectHostname(pc.name);
    const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');

    let url: string;
    switch (key) {
      case 'wp':
        url = `http://${hostname}:5477`;
        break;
      case 'phpmyadmin':
        url = `http://${phpMyAdminHostname}:5477`;
        break;
      case 'admin':
        if (lc?.login_secret) {
          url = `http://${hostname}:5477/wp-admin?kiqr_login=${lc.login_secret}`;
        } else {
          url = `http://${hostname}:5477/wp-admin`;
        }
        break;
      default:
        url = `http://${hostname}:5477`;
    }

    const openCmd =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';

    try {
      execSync(`${openCmd} "${url}"`, {stdio: 'pipe'});
    } catch {
      console.error(`Could not open browser. Visit: ${url}`);
    }

    exit();
  }, []);

  return (
    <Box>
      <Text dimColor>Opening browser...</Text>
    </Box>
  );
}
