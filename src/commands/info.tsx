import {Box, Text, useApp} from 'ink';
import {readProjectConfig, readLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {buildProjectHostname} from '../lib/hostname.js';

export const description = 'Show project info and credentials';

export default function Info() {
  const {exit} = useApp();

  const pc = readProjectConfig();
  if (!pc) {
    return (
      <Box paddingTop={1}>
        <Text color="red">This project is not initialized. Run "kiqr init" first.</Text>
      </Box>
    );
  }

  const runtimeDir = getProjectRuntimeDir(pc.project_id);
  const lc = readLocalConfig(runtimeDir);

  const hostname = buildProjectHostname(pc.name);
  const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');

  setTimeout(() => exit(), 50);

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Project</Text>
      <Text>  Name:       <Text color="cyan">{pc.name}</Text></Text>
      <Text>  ID:         <Text dimColor>{pc.project_id}</Text></Text>
      <Text> </Text>

      <Text bold>URLs</Text>
      <Text>  Site:       <Text color="cyan">http://{hostname}:5477</Text></Text>
      <Text>  Admin:      <Text color="cyan">http://{hostname}:5477/wp-admin</Text></Text>
      <Text>  phpMyAdmin: <Text color="cyan">http://{phpMyAdminHostname}:5477</Text></Text>
      <Text> </Text>

      <Text bold>WordPress</Text>
      <Text>  Username:   <Text color="green">admin</Text></Text>
      <Text>  Password:   <Text color="green">admin</Text></Text>
      <Text> </Text>

      <Text bold>Database</Text>
      <Text>  Host:       <Text color="green">mariadb</Text></Text>
      <Text>  Name:       <Text color="green">wordpress</Text></Text>
      <Text>  User:       <Text color="green">wordpress</Text></Text>
      <Text>  Password:   <Text color="green">{lc?.db_password ?? 'unknown'}</Text></Text>
      <Text>  Root pass:  <Text color="green">{lc?.db_password ?? 'unknown'}</Text></Text>
    </Box>
  );
}
