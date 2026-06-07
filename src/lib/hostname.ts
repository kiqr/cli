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

export function buildProjectHostname(projectSlug: string, subdomain?: string): string {
  // lvh.me always resolves to 127.0.0.1, so the project slug alone is enough
  // for a unique, easy-to-type local hostname — no machine segment needed.
  const base = `${projectSlug}.lvh.me`;
  if (subdomain) {
    return `${subdomain}.${base}`;
  }
  return base;
}
