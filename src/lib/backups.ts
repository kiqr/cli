export const BACKUP_EXTENSION = '.sql.gz';
export const SIDECAR_EXTENSION = '.json';

const FILENAME_RE =
  /^(?<host>[a-z0-9-]+)-(?<date>\d{8})-(?<time>\d{6})-(?<id>[0-9a-z]+)\.sql\.gz$/;

export interface BackupFilenameParts {
  host: string;
  date: Date;
  id: string;
}

export function encodeBackupId(date: Date, rng: () => number = Math.random): string {
  const seconds = Math.floor(date.getTime() / 1000);
  const prefix = seconds.toString(36);
  const suffix = Math.floor(rng() * 36 * 36)
    .toString(36)
    .padStart(2, '0');
  return `${prefix}${suffix}`;
}

export function decodeBackupTimestamp(id: string): Date {
  const prefix = id.slice(0, -2);
  const seconds = parseInt(prefix, 36);
  return new Date(seconds * 1000);
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

export function buildBackupFilename(parts: BackupFilenameParts): string {
  const d = parts.date;
  const ymd = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;
  const hms = `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}${pad(d.getUTCSeconds(), 2)}`;
  return `${parts.host}-${ymd}-${hms}-${parts.id}${BACKUP_EXTENSION}`;
}

export function parseBackupFilename(filename: string): BackupFilenameParts | null {
  const m = FILENAME_RE.exec(filename);
  if (!m?.groups) return null;
  const {host, date, time, id} = m.groups;
  const year = parseInt(date!.slice(0, 4), 10);
  const month = parseInt(date!.slice(4, 6), 10) - 1;
  const day = parseInt(date!.slice(6, 8), 10);
  const hour = parseInt(time!.slice(0, 2), 10);
  const minute = parseInt(time!.slice(2, 4), 10);
  const second = parseInt(time!.slice(4, 6), 10);
  return {
    host: host!,
    date: new Date(Date.UTC(year, month, day, hour, minute, second)),
    id: id!,
  };
}
