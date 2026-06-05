import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import type {Readable} from 'node:stream';
import {
  BACKUP_EXTENSION,
  SIDECAR_EXTENSION,
  buildBackupFilename,
  parseBackupFilename,
} from './backups.js';

export interface BackupRecord {
  id: string;
  filename: string;
  path: string;
  sidecarPath: string;
  projectId: string;
  host: string;
  createdAt: Date;
  sizeBytes: number;
  sha256: string;
}

export interface SaveOptions {
  projectId: string;
  host: string;
  createdAt: Date;
  id: string;
}

export interface BackupStorage {
  list(): Promise<BackupRecord[]>;
  findById(id: string): Promise<BackupRecord | null>;
  mostRecent(): Promise<BackupRecord | null>;
  save(stream: Readable, opts: SaveOptions): Promise<BackupRecord>;
  openRead(record: BackupRecord): Readable;
  delete(record: BackupRecord): Promise<void>;
}

interface SidecarJson {
  id: string;
  projectId: string;
  host: string;
  createdAt: string;
  sizeBytes: number;
  sha256: string;
  filename: string;
}

export class LocalBackupStorage implements BackupStorage {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private sidecarPathFor(backupPath: string): string {
    return backupPath.slice(0, -BACKUP_EXTENSION.length) + SIDECAR_EXTENSION;
  }

  async list(): Promise<BackupRecord[]> {
    if (!fs.existsSync(this.dir)) return [];
    const entries = await fs.promises.readdir(this.dir);
    const records: BackupRecord[] = [];
    for (const name of entries) {
      if (!name.endsWith(BACKUP_EXTENSION)) continue;
      const parts = parseBackupFilename(name);
      if (!parts) continue;
      const backupPath = path.join(this.dir, name);
      const sidecarPath = this.sidecarPathFor(backupPath);
      if (!fs.existsSync(sidecarPath)) continue;
      const sidecar = JSON.parse(await fs.promises.readFile(sidecarPath, 'utf-8')) as SidecarJson;
      records.push({
        id: sidecar.id,
        filename: name,
        path: backupPath,
        sidecarPath,
        projectId: sidecar.projectId,
        host: sidecar.host,
        createdAt: new Date(sidecar.createdAt),
        sizeBytes: sidecar.sizeBytes,
        sha256: sidecar.sha256,
      });
    }
    records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return records;
  }

  async findById(id: string): Promise<BackupRecord | null> {
    const all = await this.list();
    return all.find((r) => r.id === id) ?? null;
  }

  async mostRecent(): Promise<BackupRecord | null> {
    const all = await this.list();
    return all[0] ?? null;
  }

  async save(stream: Readable, opts: SaveOptions): Promise<BackupRecord> {
    fs.mkdirSync(this.dir, {recursive: true});
    const filename = buildBackupFilename({host: opts.host, date: opts.createdAt, id: opts.id});
    const backupPath = path.join(this.dir, filename);
    const sidecarPath = this.sidecarPathFor(backupPath);

    const hash = crypto.createHash('sha256');
    let sizeBytes = 0;
    const out = fs.createWriteStream(backupPath);
    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      sizeBytes += chunk.length;
    });
    await pipeline(stream, out);

    const sidecar: SidecarJson = {
      id: opts.id,
      projectId: opts.projectId,
      host: opts.host,
      createdAt: opts.createdAt.toISOString(),
      sizeBytes,
      sha256: hash.digest('hex'),
      filename,
    };
    await fs.promises.writeFile(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf-8');

    return {
      id: opts.id,
      filename,
      path: backupPath,
      sidecarPath,
      projectId: opts.projectId,
      host: opts.host,
      createdAt: opts.createdAt,
      sizeBytes,
      sha256: sidecar.sha256,
    };
  }

  openRead(record: BackupRecord): Readable {
    return fs.createReadStream(record.path);
  }

  async delete(record: BackupRecord): Promise<void> {
    await fs.promises.rm(record.path, {force: true});
    await fs.promises.rm(record.sidecarPath, {force: true});
  }
}

export class RemoteBackupStorage implements BackupStorage {
  private err(method: string): Error {
    return new Error(
      `RemoteBackupStorage.${method} is not implemented yet. ` +
        'Cloud sync will land with the Kiqr Cloud release.',
    );
  }
  async list(): Promise<BackupRecord[]> {
    throw this.err('list');
  }
  async findById(_id: string): Promise<BackupRecord | null> {
    throw this.err('findById');
  }
  async mostRecent(): Promise<BackupRecord | null> {
    throw this.err('mostRecent');
  }
  async save(_stream: Readable, _opts: SaveOptions): Promise<BackupRecord> {
    throw this.err('save');
  }
  openRead(_record: BackupRecord): Readable {
    throw this.err('openRead');
  }
  async delete(_record: BackupRecord): Promise<void> {
    throw this.err('delete');
  }
}

export function createBackupStorage(runtimeBackupsDir: string): BackupStorage {
  return new LocalBackupStorage(runtimeBackupsDir);
}
