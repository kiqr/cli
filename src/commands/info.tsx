import {Box, Text, useApp} from 'ink';
import {readLocalConfig, readProjectConfig} from '../lib/config.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {getProjectRuntimeDir} from '../lib/paths.js';

export const description = 'Show project info and credentials';

export default function Info() {
  const {exit} = useApp();

  let result:
    | {
        ok: true;
        pc: NonNullable<ReturnType<typeof readProjectConfig>>;
        lc: ReturnType<typeof readLocalConfig>;
      }
    | {ok: false; message: string | null};
  try {
    const pc = readProjectConfig();
    if (!pc) {
      result = {ok: false, message: null};
    } else {
      const lc = readLocalConfig(getProjectRuntimeDir(pc.project_id));
      result = {ok: true, pc, lc};
    }
  } catch (err) {
    result = {ok: false, message: err instanceof Error ? err.message : String(err)};
  }

  if (!result.ok) {
    const message =
      result.message ?? 'This project is not initialized. Run "kiqr init" first.';
    if (result.message !== null) {
      setTimeout(() => exit(new Error(message)), 50);
    }
    return (
      <Box paddingTop={1}>
        <Text color="red">{message}</Text>
      </Box>
    );
  }

  const {pc, lc} = result;
  const hostname = buildProjectHostname(pc.name);
  const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');

  setTimeout(() => exit(), 50);

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Project</Text>
      <Text>
        {' '}
        Name: <Text color="cyan">{pc.name}</Text>
      </Text>
      <Text>
        {' '}
        ID: <Text dimColor>{pc.project_id}</Text>
      </Text>
      <Text> </Text>

      <Text bold>URLs</Text>
      <Text>
        {' '}
        Site: <Text color="cyan">http://{hostname}:5477</Text>
      </Text>
      <Text>
        {' '}
        Admin: <Text color="cyan">http://{hostname}:5477/wp-admin</Text>
      </Text>
      <Text>
        {' '}
        phpMyAdmin: <Text color="cyan">http://{phpMyAdminHostname}:5477</Text>
      </Text>
      <Text> </Text>

      <Text bold>WordPress</Text>
      <Text>
        {' '}
        Username: <Text color="green">admin</Text>
      </Text>
      <Text>
        {' '}
        Password: <Text color="green">admin</Text>
      </Text>
      <Text> </Text>

      <Text bold>Database</Text>
      <Text>
        {' '}
        Host: <Text color="green">mariadb</Text>
      </Text>
      <Text>
        {' '}
        Name: <Text color="green">wordpress</Text>
      </Text>
      <Text>
        {' '}
        User: <Text color="green">wordpress</Text>
      </Text>
      <Text>
        {' '}
        Password: <Text color="green">{lc?.db_password ?? 'unknown'}</Text>
      </Text>
      <Text>
        {' '}
        Root pass: <Text color="green">{lc?.db_password ?? 'unknown'}</Text>
      </Text>
    </Box>
  );
}
