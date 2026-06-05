import {useEffect, useState} from 'react';
import {Box, Text, useApp} from 'ink';
import {readProjectConfig} from '../../lib/config.js';
import {getProjectBackupsDir} from '../../lib/paths.js';
import {createBackupStorage} from '../../lib/backup-storage.js';
import type {BackupRecord} from '../../lib/backup-storage.js';

export const description = 'List available database backups';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

export default function DbList() {
  const {exit} = useApp();
  const [rows, setRows] = useState<BackupRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const pc = readProjectConfig();
      if (!pc) {
        setError('This project is not initialized. Run "kiqr init" first.');
        setTimeout(() => exit(new Error()), 100);
        return;
      }
      const storage = createBackupStorage(getProjectBackupsDir(pc.project_id));
      try {
        const list = await storage.list();
        setRows(list);
        setTimeout(() => exit(), 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setTimeout(() => exit(new Error()), 100);
      }
    })();
  }, []);

  if (error) return <Text color="red">{error}</Text>;
  if (!rows) return <Text dimColor>Loading backups...</Text>;
  if (rows.length === 0) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text dimColor>No backups yet.</Text>
        <Text dimColor>Create one with: kiqr db dump</Text>
      </Box>
    );
  }

  const idW = Math.max(2, ...rows.map((r) => r.id.length));
  const fnW = Math.max(8, ...rows.map((r) => r.filename.length));
  const szW = Math.max(4, ...rows.map((r) => formatBytes(r.sizeBytes).length));

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>
        {pad('id', idW)}  {pad('filename', fnW)}  {pad('size', szW)}  date
      </Text>
      <Text dimColor>
        {'-'.repeat(idW)}  {'-'.repeat(fnW)}  {'-'.repeat(szW)}  {'-'.repeat(23)}
      </Text>
      {rows.map((r) => (
        <Text key={r.id}>
          <Text color="cyan">{pad(r.id, idW)}</Text>  {pad(r.filename, fnW)}  {pad(formatBytes(r.sizeBytes), szW)}  {formatDate(r.createdAt)}
        </Text>
      ))}
    </Box>
  );
}
