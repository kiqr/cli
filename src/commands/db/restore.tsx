import path from 'node:path';
import {createGunzip, createGzip} from 'node:zlib';
import {ConfirmInput, TextInput} from '@inkjs/ui';
import {Box, Text, useApp} from 'ink';
import {argument} from 'pastel';
import {useRef, useState} from 'react';
import zod from 'zod';
import type {Step} from '../../components/StepRunner.js';
import StepRunner from '../../components/StepRunner.js';
import type {BackupRecord, BackupStorage} from '../../lib/backup-storage.js';
import {createBackupStorage} from '../../lib/backup-storage.js';
import {encodeBackupId} from '../../lib/backups.js';
import {readProjectConfig} from '../../lib/config.js';
import {getMachineHostname} from '../../lib/hostname.js';
import {getProjectBackupsDir, getProjectRuntimeDir} from '../../lib/paths.js';
import {isWordPressInstalled, spawnWpCli} from '../../lib/wpcli.js';

export const description = 'Restore the database from a backup';

export const args = zod.tuple([
  zod
    .string()
    .describe(argument({name: 'id', description: 'Backup id (from `kiqr db list`)'})),
]);

type Props = {args: zod.infer<typeof args>};

type Phase =
  | 'loading'
  | 'ask-safety-backup'
  | 'running-safety-backup'
  | 'ask-captcha'
  | 'running-restore'
  | 'done'
  | 'error';

function generateChallenge() {
  const a = Math.floor(Math.random() * 40) + 10;
  const b = Math.floor(Math.random() * 40) + 10;
  return {a, b, answer: a + b};
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function runDump(
  composePath: string,
  storage: BackupStorage,
  projectId: string,
): Promise<BackupRecord> {
  const createdAt = new Date();
  const id = encodeBackupId(createdAt);
  const child = spawnWpCli(composePath, ['wp', 'db', 'export', '-']);
  const stderrChunks: Buffer[] = [];
  child.stderr.on('data', (c: Buffer) => stderrChunks.push(c));
  const gzipped = child.stdout.pipe(createGzip());
  const [record] = await Promise.all([
    storage.save(gzipped, {projectId, host: getMachineHostname(), createdAt, id}),
    new Promise<void>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `wp db export failed (exit ${code}): ${Buffer.concat(stderrChunks).toString().trim()}`,
            ),
          );
      });
    }),
  ]);
  return record;
}

async function runRestore(
  composePath: string,
  record: BackupRecord,
  storage: BackupStorage,
): Promise<void> {
  const child = spawnWpCli(composePath, ['wp', 'db', 'import', '-']);
  const stderrChunks: Buffer[] = [];
  child.stderr.on('data', (c: Buffer) => stderrChunks.push(c));
  const src = storage.openRead(record).pipe(createGunzip());
  src.pipe(child.stdin);
  await new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `wp db import failed (exit ${code}): ${Buffer.concat(stderrChunks).toString().trim()}`,
          ),
        );
    });
  });
}

export default function DbRestore({args}: Props) {
  const {exit} = useApp();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [wrong, setWrong] = useState(false);
  const ref = useRef<{
    record: BackupRecord | null;
    composePath: string;
    storage: BackupStorage | null;
    projectId: string;
    challenge: {a: number; b: number; answer: number};
    safetyRecord: BackupRecord | null;
    initialized: boolean;
  }>({
    record: null,
    composePath: '',
    storage: null,
    projectId: '',
    challenge: generateChallenge(),
    safetyRecord: null,
    initialized: false,
  });

  // One-shot init: resolve the backup, then branch
  if (!ref.current.initialized) {
    ref.current.initialized = true;
    (async () => {
      const pc = readProjectConfig();
      if (!pc) {
        setErrorMsg('This project is not initialized. Run "kiqr init" first.');
        setPhase('error');
        setTimeout(() => exit(new Error()), 100);
        return;
      }
      const composePath = path.join(getProjectRuntimeDir(pc.project_id), 'compose.yaml');
      const storage = createBackupStorage(getProjectBackupsDir(pc.project_id));
      ref.current.composePath = composePath;
      ref.current.storage = storage;
      ref.current.projectId = pc.project_id;

      const record = await storage.findById(args[0]);
      if (!record) {
        setErrorMsg(
          `No backup with id "${args[0]}". Run "kiqr db list" to see available backups.`,
        );
        setPhase('error');
        setTimeout(() => exit(new Error()), 100);
        return;
      }
      ref.current.record = record;

      const recent = await storage.mostRecent();
      const hasRecent =
        recent && Date.now() - recent.createdAt.getTime() < FIVE_MINUTES_MS;
      if (!hasRecent) {
        setPhase('ask-safety-backup');
      } else {
        if (isWordPressInstalled(composePath)) {
          setPhase('ask-captcha');
        } else {
          setPhase('running-restore');
        }
      }
    })().catch((err) => {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
      setTimeout(() => exit(new Error()), 100);
    });
  }

  if (phase === 'loading') return <Text dimColor>Loading...</Text>;

  if (phase === 'error') return <Text color="red">{errorMsg}</Text>;

  if (phase === 'ask-safety-backup') {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text>No backup has been made in the last 5 minutes.</Text>
        <Box marginTop={1}>
          <Text>Make a safety backup first? </Text>
          <ConfirmInput
            onConfirm={() => setPhase('running-safety-backup')}
            onCancel={() => {
              if (isWordPressInstalled(ref.current.composePath)) {
                setPhase('ask-captcha');
              } else {
                setPhase('running-restore');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'ask-captcha') {
    const challenge = ref.current.challenge;
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text color="yellow" bold>
          This will overwrite the current database with backup {ref.current.record!.id}.
        </Text>
        <Text> </Text>
        <Text>
          To confirm, solve this:{' '}
          <Text bold color="yellow">
            What is {challenge.a} + {challenge.b}?
          </Text>
        </Text>
        <Box marginTop={1}>
          {wrong && <Text color="red">Wrong answer. </Text>}
          <Text dimColor>Answer: </Text>
          <TextInput
            onSubmit={(value) => {
              if (parseInt(value, 10) === challenge.answer) {
                setPhase('running-restore');
              } else {
                setWrong(true);
                ref.current.challenge = generateChallenge();
                setTimeout(() => exit(new Error()), 100);
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'running-safety-backup') {
    const steps: Step[] = [
      {
        label: 'Creating safety backup...',
        run: async () => {
          try {
            ref.current.safetyRecord = await runDump(
              ref.current.composePath,
              ref.current.storage!,
              ref.current.projectId,
            );
          } catch (err) {
            throw new Error(
              `Safety backup failed; restore aborted. ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        },
      },
    ];
    return (
      <Box flexDirection="column">
        <StepRunner
          steps={steps}
          onComplete={() => {
            if (isWordPressInstalled(ref.current.composePath)) {
              setPhase('ask-captcha');
            } else {
              setPhase('running-restore');
            }
          }}
          onError={() => setTimeout(() => exit(new Error()), 100)}
        />
      </Box>
    );
  }

  if (phase === 'running-restore') {
    const steps: Step[] = [
      {
        label: `Restoring database from ${ref.current.record!.id}...`,
        run: async () => {
          await runRestore(
            ref.current.composePath,
            ref.current.record!,
            ref.current.storage!,
          );
        },
      },
    ];
    return (
      <Box flexDirection="column">
        <StepRunner
          steps={steps}
          onComplete={() => {
            setPhase('done');
            setTimeout(() => exit(), 100);
          }}
          onError={() => setTimeout(() => exit(new Error()), 100)}
        />
      </Box>
    );
  }

  // phase === 'done'
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="green">
        Database restored from {ref.current.record!.id}.
      </Text>
      {ref.current.safetyRecord && (
        <Text dimColor>Safety backup saved as {ref.current.safetyRecord.id}.</Text>
      )}
    </Box>
  );
}
