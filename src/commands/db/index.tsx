import {Box, Text} from 'ink';

export const description = 'Database backup and restore';

export default function DbIndex() {
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Kiqr DB</Text>
      <Text dimColor>Backup and restore the project database</Text>
      <Text> </Text>
      <Text>Commands:</Text>
      <Text>
        {' '}
        <Text bold>kiqr db dump</Text> Create a compressed SQL backup
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr db list</Text> List available backups
      </Text>
      <Text>
        {' '}
        <Text bold>kiqr db restore &lt;id&gt;</Text> Restore from a backup
      </Text>
    </Box>
  );
}
