import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createGzip} from 'node:zlib';
import {
  LocalBackupStorage,
  RemoteBackupStorage,
  createBackupStorage,
} from '../../src/lib/backup-storage.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-backups-'));
});
afterEach(() => {
  fs.rmSync(tmp, {recursive: true, force: true});
});

describe('LocalBackupStorage.save', () => {
  it('stores a gzipped stream and writes a sidecar', async () => {
    const storage = new LocalBackupStorage(tmp);
    const src = Readable.from(['SELECT 1;\n']).pipe(createGzip());
    const date = new Date('2026-06-05T14:30:12.000Z');
    const record = await storage.save(src, {
      projectId: 'proj-1',
      host: 'my-mbp',
      createdAt: date,
      id: 'abc12xy',
    });
    expect(record.filename).toBe('my-mbp-20260605-143012-abc12xy.sql.gz');
    expect(fs.existsSync(record.path)).toBe(true);
    expect(fs.existsSync(record.path.replace('.sql.gz', '.json'))).toBe(true);
    const sidecar = JSON.parse(fs.readFileSync(record.path.replace('.sql.gz', '.json'), 'utf-8'));
    expect(sidecar.id).toBe('abc12xy');
    expect(sidecar.projectId).toBe('proj-1');
    expect(sidecar.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(sidecar.sizeBytes).toBeGreaterThan(0);
  });
});

describe('LocalBackupStorage.list / findById', () => {
  it('lists all valid backups newest-first and finds by id', async () => {
    const storage = new LocalBackupStorage(tmp);
    for (const id of ['aaa11ax', 'bbb22by']) {
      const src = Readable.from([`SELECT '${id}';`]).pipe(createGzip());
      const offsetMs = id.startsWith('aaa') ? 0 : 60_000;
      await storage.save(src, {
        projectId: 'p',
        host: 'h',
        createdAt: new Date(Date.parse('2026-06-05T14:30:12Z') + offsetMs),
        id,
      });
    }
    const list = await storage.list();
    expect(list.map((r) => r.id)).toEqual(['bbb22by', 'aaa11ax']);
    const found = await storage.findById('aaa11ax');
    expect(found?.filename).toContain('aaa11ax');
  });

  it('returns an empty list when the dir does not exist', async () => {
    const storage = new LocalBackupStorage(path.join(tmp, 'missing'));
    expect(await storage.list()).toEqual([]);
    expect(await storage.findById('whatever')).toBeNull();
  });
});

describe('LocalBackupStorage.mostRecent', () => {
  it('returns the newest record or null', async () => {
    const storage = new LocalBackupStorage(tmp);
    expect(await storage.mostRecent()).toBeNull();
    const src = Readable.from(['a']).pipe(createGzip());
    await storage.save(src, {
      projectId: 'p',
      host: 'h',
      createdAt: new Date(),
      id: 'newest1',
    });
    const rec = await storage.mostRecent();
    expect(rec?.id).toBe('newest1');
  });
});

describe('RemoteBackupStorage', () => {
  it('throws not-implemented on all methods', async () => {
    const remote = new RemoteBackupStorage();
    await expect(remote.list()).rejects.toThrow(/not implemented/i);
    await expect(remote.findById('x')).rejects.toThrow(/not implemented/i);
    await expect(remote.mostRecent()).rejects.toThrow(/not implemented/i);
  });
});

describe('createBackupStorage', () => {
  it('returns a LocalBackupStorage by default', () => {
    const s = createBackupStorage(tmp);
    expect(s).toBeInstanceOf(LocalBackupStorage);
  });
});
