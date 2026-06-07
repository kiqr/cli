import path from 'node:path';
import {createGzip} from 'node:zlib';
import {Box, Text, useApp} from 'ink';
import {useRef, useState} from 'react';
import type {Step} from '../../components/StepRunner.js';
import StepRunner from '../../components/StepRunner.js';
import type {BackupRecord} from '../../lib/backup-storage.js';
import {createBackupStorage} from '../../lib/backup-storage.js';
import {encodeBackupId} from '../../lib/backups.js';
import {readProjectConfig} from '../../lib/config.js';
import {getMachineHostname} from '../../lib/hostname.js';
import {getProjectBackupsDir, getProjectRuntimeDir} from '../../lib/paths.js';
import {spawnWpCli} from '../../lib/wpcli.js';

export const description = 'Create a compressed SQL backup of the database';

export default function DbDump() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);
  const ref = useRef<{record: BackupRecord | null}>({record: null});

  const steps: Step[] = [
    {
      label: 'Creating database backup...',
      run: async () => {
        const pc = readProjectConfig();
        if (!pc) {
          throw new Error('This project is not initialized. Run "kiqr init" first.');
        }
        const composePath = path.join(
          getProjectRuntimeDir(pc.project_id),
          'compose.yaml',
        );
        const storage = createBackupStorage(getProjectBackupsDir(pc.project_id));
        const createdAt = new Date();
        const id = encodeBackupId(createdAt);

        const child = spawnWpCli(composePath, ['wp', 'db', 'export', '-']);
        const stderrChunks: Buffer[] = [];
        child.stderr.on('data', (c: Buffer) => stderrChunks.push(c));

        const gzipped = child.stdout.pipe(createGzip());

        const [record] = await Promise.all([
          storage.save(gzipped, {
            projectId: pc.project_id,
            host: getMachineHostname(),
            createdAt,
            id,
          }),
          new Promise<void>((resolve, reject) => {
            child.on('error', reject);
            child.on('close', (code) => {
              if (code === 0) resolve();
              else {
                const msg = Buffer.concat(stderrChunks).toString().trim();
                reject(
                  new Error(`wp db export failed (exit ${code}): ${msg || 'no output'}`),
                );
              }
            });
          }),
        ]);

        ref.current.record = record;
      },
    },
  ];

  return (
    <Box flexDirection="column">
      <StepRunner
        steps={steps}
        onComplete={() => {
          setComplete(true);
          setTimeout(() => exit(), 100);
        }}
        onError={() => setTimeout(() => exit(new Error()), 100)}
      />
      {complete && ref.current.record && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">
            Backup created.
          </Text>
          <Text> </Text>
          <Text>
            ID:{' '}
            <Text bold color="cyan">
              {ref.current.record.id}
            </Text>
          </Text>
          <Text>
            File: <Text dimColor>{ref.current.record.filename}</Text>
          </Text>
          <Text dimColor>Restore with: kiqr db restore {ref.current.record.id}</Text>
        </Box>
      )}
    </Box>
  );
}
