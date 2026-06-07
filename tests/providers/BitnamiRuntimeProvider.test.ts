import {describe, it, expect} from 'vitest';
import {BitnamiRuntimeProvider} from '../../src/providers/BitnamiRuntimeProvider.js';

describe('BitnamiRuntimeProvider', () => {
  const provider = new BitnamiRuntimeProvider();

  it('returns the php-pinned latest image when version is latest', () => {
    const image = provider.getWordPressImage('latest', '8.3');
    expect(image).toBe('wordpress:php8.3');
  });

  it('returns a version+php-pinned image for a specific version', () => {
    const image = provider.getWordPressImage('6.7', '8.4');
    expect(image).toBe('wordpress:6.7-php8.4');
  });

  it('honors the configured php version', () => {
    expect(provider.getWordPressImage('latest', '8.2')).toBe('wordpress:php8.2');
    expect(provider.getWordPressImage('6.7', '8.2')).toBe('wordpress:6.7-php8.2');
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
      phpVersion: '8.3',
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
    expect(services['wordpress']!.image).toBe('wordpress:6.7-php8.3');
    expect(services['wpcli']!.image).toBe('wordpress:cli-php8.3');
    expect(services['mariadb']!.image).toBe('mariadb:11.4');
  });

  it('uses latest when version is latest', () => {
    const services = provider.generateComposeServices({
      projectSlug: 'my-theme',
      themePath: '/home/user/my-theme',
      themeSlug: 'my-theme',
      hostname: 'my-theme.test.lvh.me',
      phpMyAdminHostname: 'phpmyadmin.my-theme.test.lvh.me',
      wordpressVersion: 'latest',
      phpVersion: '8.4',
      dbPassword: 'test_password',
      loginSecret: 'secret123',
      muPluginPath: '/tmp/mu-plugin.php',
      pluginsPath: '/tmp/plugins',
      uploadsPath: '/tmp/uploads',
      dataDir: '/tmp/kiqr/projects/uuid',
    });
    expect(services['wordpress']!.image).toBe('wordpress:php8.4');
    expect(services['wpcli']!.image).toBe('wordpress:cli-php8.4');
  });
});
