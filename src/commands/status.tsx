import {Box, Text, useApp} from 'ink';
import {useEffect, useState} from 'react';
import {isContainerRunning} from '../lib/docker.js';
import {
  getProjectStatus,
  type ProjectStatus,
  serviceFromContainerName,
} from '../lib/status.js';

export const description = 'Show whether the project is running and where to reach it';

function StatusDot({running}: {running: boolean}) {
  return running ? <Text color="green">●</Text> : <Text color="red">○</Text>;
}

export default function Status() {
  const {exit} = useApp();
  const [status, setStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    setStatus(getProjectStatus({isContainerRunning}));
    setTimeout(() => exit(), 50);
  }, []);

  if (!status) return <Text dimColor>Checking status...</Text>;

  if (!status.initialized) {
    return (
      <Box paddingTop={1}>
        <Text color="red">This project is not initialized. Run "kiqr init" first.</Text>
      </Box>
    );
  }

  const labelW = Math.max(
    ...status.containers.map((c) => serviceFromContainerName(c.name).length),
  );

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text>
        <Text bold>Status: </Text>
        {status.running ? (
          <Text color="green" bold>
            running
          </Text>
        ) : (
          <Text color="red" bold>
            stopped
          </Text>
        )}
      </Text>
      <Text> </Text>

      <Text bold>Services</Text>
      {status.containers.map((c) => (
        <Text key={c.name}>
          {' '}
          <StatusDot running={c.running} />{' '}
          {serviceFromContainerName(c.name).padEnd(labelW)}{' '}
          <Text dimColor>{c.running ? 'running' : 'stopped'}</Text>
        </Text>
      ))}

      {status.urls ? (
        <>
          <Text> </Text>
          <Text bold>URLs</Text>
          <Text>
            {' '}
            Site: <Text color="cyan">{status.urls.site}</Text>
          </Text>
          <Text>
            {' '}
            Admin: <Text color="cyan">{status.urls.admin}</Text>
          </Text>
          <Text>
            {' '}
            phpMyAdmin: <Text color="cyan">{status.urls.phpmyadmin}</Text>
          </Text>
        </>
      ) : (
        <>
          <Text> </Text>
          <Text dimColor>Start the project with: kiqr up</Text>
        </>
      )}
    </Box>
  );
}
