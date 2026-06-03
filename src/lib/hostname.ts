import os from 'node:os';

export function getMachineHostname(): string {
  return sanitizeHostname(os.hostname());
}

export function sanitizeHostname(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\.local$/, '')
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildProjectHostname(
  projectSlug: string,
  subdomain?: string,
): string {
  const machine = getMachineHostname();
  const base = `${projectSlug}.${machine}.lvh.me`;
  if (subdomain) {
    return `${subdomain}.${base}`;
  }
  return base;
}
