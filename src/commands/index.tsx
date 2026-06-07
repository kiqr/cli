import {Box, Text} from 'ink';

export const description = 'WordPress theme development CLI';

export default function Index() {
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Kiqr CLI</Text>
      <Text dimColor>Local WordPress theme development</Text>
      <Text> </Text>
      <Text>Commands:</Text>
      <Text>
        {' '}
        <Text bold>kiqr doctor</Text> Check your environment for common problems
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr init</Text> Initialize a new project
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr up</Text> Start the development environment
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr down</Text> Stop the development environment
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr restart</Text> Restart the development environment
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr watch</Text> Watch files and auto-reload browser
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr info</Text> Show project info and credentials
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr open</Text> Open site, admin, or phpMyAdmin in browser
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr wp</Text> Run a WP-CLI command
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr db</Text> Backup and restore the database
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr logs</Text> Show WordPress logs
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr destroy</Text> Remove all site data and start fresh
      </Text>
      <Text> </Text>
      <Text dimColor>
        Run <Text bold>kiqr --help</Text> for more information.
      </Text>
    </Box>
  );
}
