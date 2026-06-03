import {describe, it, expect} from 'vitest';
import {generateTraefikCompose} from '../../src/lib/traefik.js';
import YAML from 'yaml';

describe('generateTraefikCompose', () => {
  it('generates valid compose YAML for Traefik', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    expect(parsed.services.traefik).toBeDefined();
    expect(parsed.services.traefik.image).toContain('traefik');
  });

  it('exposes port 5477', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    const ports = parsed.services.traefik.ports;
    expect(ports.some((p: string) => p.includes('5477'))).toBe(true);
  });

  it('creates kiqr network', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    expect(parsed.networks['kiqr']).toBeDefined();
  });

  it('mounts Docker socket', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    const volumes = parsed.services.traefik.volumes;
    expect(volumes.some((v: string) => v.includes('docker.sock'))).toBe(true);
  });
});
