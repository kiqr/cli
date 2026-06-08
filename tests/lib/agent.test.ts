import {describe, expect, it} from 'vitest';
import YAML from 'yaml';
import {
  AGENT_CONTAINERS,
  AGENT_PORT,
  AGENT_PROJECT,
  generateAgentCompose,
  getAgentStatus,
} from '../../src/lib/agent.js';

describe('generateAgentCompose', () => {
  it('generates valid compose YAML for Traefik', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    expect(parsed.services.traefik).toBeDefined();
    expect(parsed.services.traefik.image).toContain('traefik');
  });

  it('uses the kiqr-agent compose project name', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    expect(parsed.name).toBe(AGENT_PROJECT);
    expect(AGENT_PROJECT).toBe('kiqr-agent');
  });

  it('keeps the original container names for compatibility', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    expect(parsed.services.traefik.container_name).toBe('kiqr-traefik');
    expect(parsed.services.splash.container_name).toBe('kiqr-splash');
  });

  it('exposes the agent port', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    const ports = parsed.services.traefik.ports;
    expect(ports.some((p: string) => p.includes(String(AGENT_PORT)))).toBe(true);
  });

  it('creates kiqr network', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    expect(parsed.networks['kiqr']).toBeDefined();
    expect(parsed.networks['kiqr'].external).toBe(true);
  });

  it('mounts Docker socket', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    const volumes = parsed.services.traefik.volumes;
    expect(volumes.some((v: string) => v.includes('docker.sock'))).toBe(true);
  });

  it('trusts X-Forwarded-* headers from any peer (dev-mode escape hatch)', () => {
    // Cloudflared (`kiqr share`) connects from the host via Docker port
    // publishing; on Docker Desktop for Mac/Windows the NAT'd source IP
    // doesn't always fall in the expected RFC1918 range, so a CIDR-based
    // trustedIPs list misses it and Traefik clobbers the forwarded headers,
    // breaking the https-tunnel handoff. Since the agent is a single-user
    // local dev tool, accept all peers.
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    const command = parsed.services.traefik.command as string[];
    expect(
      command.some((c) => c === '--entrypoints.web.forwardedHeaders.insecure=true'),
    ).toBe(true);
  });

  it('includes splash page container with lowest priority', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    expect(parsed.services.splash).toBeDefined();
    expect(parsed.services.splash.image).toBe('nginx:1.30-alpine');
    const labels = parsed.services.splash.labels;
    expect(labels.some((l: string) => l.includes('priority=1'))).toBe(true);
  });

  it('includes the Mailpit email catcher with a pinned image', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    expect(parsed.services.mailpit).toBeDefined();
    expect(parsed.services.mailpit.image).toBe('axllent/mailpit:v1.30.1');
    expect(parsed.services.mailpit.container_name).toBe('kiqr-mailpit');
    expect(parsed.services.mailpit.networks).toContain('kiqr');
    expect(parsed.services.mailpit.restart).toBe('unless-stopped');
  });

  it('routes mail.lvh.me to the Mailpit web UI on port 8025', () => {
    const yaml = generateAgentCompose('/tmp/kiqr/agent');
    const parsed = YAML.parse(yaml);
    const labels: string[] = parsed.services.mailpit.labels;
    expect(labels).toContain('traefik.enable=true');
    expect(labels).toContain(
      'traefik.http.routers.kiqr-mailpit.rule=Host(`mail.lvh.me`)',
    );
    expect(labels).toContain('traefik.http.routers.kiqr-mailpit.entrypoints=web');
    expect(labels).toContain(
      'traefik.http.services.kiqr-mailpit.loadbalancer.server.port=8025',
    );
  });
});

describe('getAgentStatus', () => {
  it('reports running when all agent containers are up', () => {
    const status = getAgentStatus({isContainerRunning: () => true});
    expect(status.running).toBe(true);
    expect(status.port).toBe(AGENT_PORT);
    expect(status.containers).toHaveLength(AGENT_CONTAINERS.length);
    expect(status.containers.every((c) => c.running)).toBe(true);
  });

  it('reports not running when no agent containers are up', () => {
    const status = getAgentStatus({isContainerRunning: () => false});
    expect(status.running).toBe(false);
    expect(status.containers.every((c) => !c.running)).toBe(true);
  });

  it('reports not running when only some containers are up', () => {
    const status = getAgentStatus({
      isContainerRunning: (name) => name === 'kiqr-traefik',
    });
    expect(status.running).toBe(false);
    const traefik = status.containers.find((c) => c.name === 'kiqr-traefik');
    const splash = status.containers.find((c) => c.name === 'kiqr-splash');
    expect(traefik?.running).toBe(true);
    expect(splash?.running).toBe(false);
  });

  it('queries each known agent container by name', () => {
    const queried: string[] = [];
    getAgentStatus({
      isContainerRunning: (name) => {
        queried.push(name);
        return true;
      },
    });
    expect(queried).toEqual([...AGENT_CONTAINERS]);
  });
});
