import {Box, Text} from 'ink';

export const description = 'Scaffold a new WordPress theme';

export default function ScaffoldIndex() {
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Kiqr Scaffold</Text>
      <Text dimColor>Generate a production-ready WordPress theme</Text>
      <Text> </Text>
      <Text>Commands:</Text>
      <Text>
        {' '}
        <Text bold>kiqr scaffold theme &lt;name&gt;</Text> Create a new theme directory
      </Text>
      <Text> </Text>
      <Text dimColor>
        Use <Text bold>--type block</Text> (default) for a Full Site Editing theme, or{' '}
        <Text bold>--type classic</Text> for a classic theme.
      </Text>
    </Box>
  );
}
