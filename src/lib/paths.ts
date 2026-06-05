import path from 'node:path';

export function getKiqrDataDir(platform: NodeJS.Platform = process.platform): string {
  switch (platform) {
    case 'darwin': {
      const home = process.env['HOME'];
      if (!home) throw new Error('HOME environment variable is not set');
      return path.join(home, 'Library', 'Application Support', 'Kiqr');
    }
    case 'linux': {
      const home = process.env['HOME'];
      if (!home) throw new Error('HOME environment variable is not set');
      return path.join(home, '.config', 'kiqr');
    }
    case 'win32': {
      const appData = process.env['APPDATA'];
      if (!appData) throw new Error('APPDATA environment variable is not set');
      return path.join(appData, 'Kiqr');
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export function getProjectRuntimeDir(
  projectId: string,
  platform: NodeJS.Platform = process.platform,
): string {
  return path.join(getKiqrDataDir(platform), 'projects', projectId);
}

export function getTraefikDir(platform: NodeJS.Platform = process.platform): string {
  return path.join(getKiqrDataDir(platform), 'traefik');
}

export function getProjectPluginsDir(projectId: string, platform: NodeJS.Platform = process.platform): string {
  return path.join(getProjectRuntimeDir(projectId, platform), 'plugins');
}

export function getProjectUploadsDir(projectId: string, platform: NodeJS.Platform = process.platform): string {
  return path.join(getProjectRuntimeDir(projectId, platform), 'uploads');
}

export function getProjectBackupsDir(projectId: string, platform: NodeJS.Platform = process.platform): string {
  return path.join(getProjectRuntimeDir(projectId, platform), 'backups');
}
