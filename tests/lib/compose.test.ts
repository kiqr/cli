import {describe, it, expect} from 'vitest';
import {generateProjectCompose} from '../../src/lib/compose.js';
import type {RuntimeConfig} from '../../src/providers/RuntimeProvider.js';
import YAML from 'yaml';

describe('generateProjectCompose', () => {
  const config: RuntimeConfig = {
    projectSlug: 'my-theme',
    themePath: '/home/user/my-theme',
    themeSlug: 'my-theme',
    hostname: 'my-theme.test.local',
    phpMyAdminHostname: 'phpmyadmin.my-theme.test.local',
    dbPassword: 'test_password',
    dataDir: '/tmp/kiqr/projects/uuid',
  };

  it('generates valid YAML with all three services', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    expect(parsed.services.wordpress).toBeDefined();
    expect(parsed.services.mariadb).toBeDefined();
    expect(parsed.services.phpmyadmin).toBeDefined();
  });

  it('includes the kiqr external network', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    expect(parsed.networks['kiqr']).toEqual({external: true});
  });

  it('includes named volumes', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    expect(parsed.volumes).toHaveProperty('wordpress_data');
    expect(parsed.volumes).toHaveProperty('mariadb_data');
  });

  it('mounts the theme directory into wordpress', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    const wpVolumes = parsed.services.wordpress.volumes;
    expect(wpVolumes.some((v: string) => v.includes('/home/user/my-theme'))).toBe(true);
  });
});
