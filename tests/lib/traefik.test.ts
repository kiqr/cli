import {describe, expect, it} from 'vitest';
import YAML from 'yaml';
import {generateTraefikCompose} from '../../src/lib/traefik.js';

describe('generateTraefikCompose', () => {
  it('generates valid compose YAML for Traefik', () => {
    const yaml = generateTraefikCompose('/tmp/kiqr/traefik');
    const parsed = YAML.parse(yaml);
    expect(parsed.services.traefik).toBeDefined();
    expect(parsed.services.traefik.image).toContain('traefik');
  });

  it('exposes port 5477', () => {
    const yaml = generateTraefikCompose('/tmp/kiqr/traefik');
    const parsed = YAML.parse(yaml);
    const ports = parsed.services.traefik.ports;
    expect(ports.some((p: string) => p.includes('5477'))).toBe(true);
  });

  it('creates kiqr network', () => {
    const yaml = generateTraefikCompose('/tmp/kiqr/traefik');
    const parsed = YAML.parse(yaml);
    expect(parsed.networks['kiqr']).toBeDefined();
  });

  it('mounts Docker socket', () => {
    const yaml = generateTraefikCompose('/tmp/kiqr/traefik');
    const parsed = YAML.parse(yaml);
    const volumes = parsed.services.traefik.volumes;
    expect(volumes.some((v: string) => v.includes('docker.sock'))).toBe(true);
  });

  it('includes splash page container with lowest priority', () => {
    const yaml = generateTraefikCompose('/tmp/kiqr/traefik');
    const parsed = YAML.parse(yaml);
    expect(parsed.services.splash).toBeDefined();
    expect(parsed.services.splash.image).toBe('nginx:1.30-alpine');
    const labels = parsed.services.splash.labels;
    expect(labels.some((l: string) => l.includes('priority=1'))).toBe(true);
  });
});
