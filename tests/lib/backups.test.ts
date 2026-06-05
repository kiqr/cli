import {describe, it, expect} from 'vitest';
import {
  encodeBackupId,
  decodeBackupTimestamp,
  buildBackupFilename,
  parseBackupFilename,
  BACKUP_EXTENSION,
  SIDECAR_EXTENSION,
} from '../../src/lib/backups.js';

describe('encodeBackupId', () => {
  it('produces a stable base36 prefix from a Date and a 2-char random suffix', () => {
    const date = new Date('2026-06-05T14:30:12.000Z');
    const id = encodeBackupId(date, () => 0.5);
    const expectedPrefix = Math.floor(date.getTime() / 1000).toString(36);
    expect(id.startsWith(expectedPrefix)).toBe(true);
    expect(id).toMatch(/^[0-9a-z]{8,}$/);
    expect(id.length).toBeGreaterThanOrEqual(8);
  });
});

describe('decodeBackupTimestamp', () => {
  it('round-trips with encodeBackupId', () => {
    const date = new Date('2026-06-05T14:30:12.000Z');
    const id = encodeBackupId(date, () => 0.1);
    expect(decodeBackupTimestamp(id).getTime()).toBe(date.getTime());
  });
});

describe('buildBackupFilename / parseBackupFilename', () => {
  it('builds and parses round-trip', () => {
    const filename = buildBackupFilename({
      host: 'my-mbp',
      date: new Date('2026-06-05T14:30:12.000Z'),
      id: 'abc12xy',
    });
    expect(filename).toBe(`my-mbp-20260605-143012-abc12xy${BACKUP_EXTENSION}`);
    const parsed = parseBackupFilename(filename);
    expect(parsed).toEqual({
      host: 'my-mbp',
      date: new Date('2026-06-05T14:30:12.000Z'),
      id: 'abc12xy',
    });
  });

  it('parseBackupFilename returns null on non-matching names', () => {
    expect(parseBackupFilename('not-a-backup.txt')).toBeNull();
    expect(parseBackupFilename('only-prefix.sql.gz')).toBeNull();
  });

  it('exports the sidecar extension', () => {
    expect(SIDECAR_EXTENSION).toBe('.json');
  });
});
