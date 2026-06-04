import {describe, it, expect} from 'vitest';
import {BitnamiRuntimeProvider} from '../../src/providers/BitnamiRuntimeProvider.js';

describe('BitnamiRuntimeProvider', () => {
  const provider = new BitnamiRuntimeProvider();

  it('returns wordpress image name', () => {
    const image = provider.getWordPressImage('latest', '8.3');
    expect(image).toBe('wordpress:latest');
  });

  it('returns correct theme mount target', () => {
    const mount = provider.getThemeMountTarget('my-theme');
    expect(mount).toBe('/var/www/html/wp-content/themes/my-theme');
  });

  it('returns environment variables', () => {
    const env = provider.getEnvironmentVariables({
      dbName: 'wordpress',
      dbUser: 'wordpress',
      dbPassword: 'wordpress_password',
    });
    expect(env['WORDPRESS_DB_HOST']).toBe('mariadb');
    expect(env['WORDPRESS_DB_NAME']).toBe('wordpress');
  });

  it('returns compose services with correct version', () => {
    const services = provider.generateComposeServices({
      projectSlug: 'my-theme',
      themePath: '/home/user/my-theme',
      themeSlug: 'my-theme',
      hostname: 'my-theme.test.lvh.me',
      phpMyAdminHostname: 'phpmyadmin.my-theme.test.lvh.me',
      wordpressVersion: '6.7',
      dbPassword: 'test_password',
      loginSecret: 'secret123',
      muPluginPath: '/tmp/mu-plugin.php',
      pluginsPath: '/tmp/plugins',
      uploadsPath: '/tmp/uploads',
      dataDir: '/tmp/kiqr/projects/uuid',
    });
    expect(services['wordpress']).toBeDefined();
    expect(services['mariadb']).toBeDefined();
    expect(services['phpmyadmin']).toBeDefined();
    expect(services['wordpress']!.image).toBe('wordpress:6.7');
    expect(services['mariadb']!.image).toBe('mariadb:latest');
  });

  it('uses latest when version is latest', () => {
    const services = provider.generateComposeServices({
      projectSlug: 'my-theme',
      themePath: '/home/user/my-theme',
      themeSlug: 'my-theme',
      hostname: 'my-theme.test.lvh.me',
      phpMyAdminHostname: 'phpmyadmin.my-theme.test.lvh.me',
      wordpressVersion: 'latest',
      dbPassword: 'test_password',
      loginSecret: 'secret123',
      muPluginPath: '/tmp/mu-plugin.php',
      pluginsPath: '/tmp/plugins',
      uploadsPath: '/tmp/uploads',
      dataDir: '/tmp/kiqr/projects/uuid',
    });
    expect(services['wordpress']!.image).toBe('wordpress:latest');
  });
});
