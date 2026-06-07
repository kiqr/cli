import {Box, Text, useApp} from 'ink';
import {useEffect, useState} from 'react';
import {type DoctorCheck, runDoctorChecks} from '../lib/doctor.js';

export const description = 'Check your environment for common problems';

export default function Doctor() {
  const {exit} = useApp();
  const [checks, setChecks] = useState<DoctorCheck[] | null>(null);

  useEffect(() => {
    (async () => {
      const results = await runDoctorChecks();
      setChecks(results);
      const ok = results.every((c) => c.ok);
      setTimeout(() => exit(ok ? undefined : new Error()), 100);
    })();
  }, []);

  if (!checks) return <Text dimColor>Running checks...</Text>;

  const allOk = checks.every((c) => c.ok);

  return (
    <Box flexDirection="column" paddingTop={1}>
      {checks.map((check) => (
        <Box key={check.name}>
          <Text color={check.ok ? 'green' : 'red'}>
            {check.ok ? '✓' : '✗'}{' '}
          </Text>
          <Text>{check.name}</Text>
          <Text dimColor> — {check.detail}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        {allOk ? (
          <Text bold color="green">
            Everything looks good.
          </Text>
        ) : (
          <Text bold color="red">
            Some checks failed. Resolve the issues above and run "kiqr doctor"
            again.
          </Text>
        )}
      </Box>
    </Box>
  );
}
