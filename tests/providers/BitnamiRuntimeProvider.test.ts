import {describe, expect, it} from 'vitest';
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

  it('derives dynamic URLs from X-Forwarded-Host with an HTTP_HOST fallback', () => {
    const env = provider.getEnvironmentVariables({
      dbName: 'wordpress',
      dbUser: 'wordpress',
      dbPassword: 'wordpress_password',
    });
    const extra = env['WORDPRESS_CONFIG_EXTRA']!;

    // Prefers the public host forwarded by the tunnel, then falls back to the
    // local Host header for normal requests (unchanged local behavior).
    expect(extra).toContain("$$_SERVER['HTTP_X_FORWARDED_HOST']");
    expect(extra).toContain("$$_SERVER['HTTP_HOST']");
    // Honors the forwarded scheme so tunneled (https) requests generate https
    // URLs, defaulting to http locally.
    expect(extra).toContain("$$_SERVER['HTTP_X_FORWARDED_PROTO']");
    expect(extra).toContain("=== 'https'");
    // Still defines both URL constants and keeps the kiqr dev flag.
    expect(extra).toContain("define('WP_HOME'");
    expect(extra).toContain("define('WP_SITEURL'");
    expect(extra).toContain("define('KIQR_DEVELOPMENT', true)");
    // PHP `$` must stay escaped as `$$` so docker-compose unescapes it; there
    // must be no lone `$` (a single, unescaped sigil) anywhere in the string.
    expect(extra).not.toMatch(/(^|[^$])\$([^$]|$)/);
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
      xdebugEnabled: false,
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
      xdebugEnabled: false,
    });
    expect(services['wordpress']!.image).toBe('wordpress:php8.4');
    expect(services['wpcli']!.image).toBe('wordpress:cli-php8.4');
  });

  const baseConfig = {
    projectSlug: 'my-theme',
    themePath: '/home/user/my-theme',
    themeSlug: 'my-theme',
    hostname: 'my-theme.test.lvh.me',
    phpMyAdminHostname: 'phpmyadmin.my-theme.test.lvh.me',
    wordpressVersion: 'latest',
    phpVersion: '8.3',
    dbPassword: 'test_password',
    loginSecret: 'secret123',
    muPluginPath: '/tmp/mu-plugin.php',
    pluginsPath: '/tmp/plugins',
    uploadsPath: '/tmp/uploads',
    dataDir: '/tmp/kiqr/projects/uuid',
  };

  it('uses an image (not a build) and only the hostname extra_host when xdebug is off', () => {
    const services = provider.generateComposeServices({
      ...baseConfig,
      xdebugEnabled: false,
    });
    const wp = services['wordpress']!;
    expect(wp.image).toBe('wordpress:php8.3');
    expect(wp.build).toBeUndefined();
    expect(wp.extra_hosts).toEqual(['my-theme.test.lvh.me:host-gateway']);
    expect(wp.extra_hosts).not.toContain('host.docker.internal:host-gateway');
  });

  it('builds from the generated Dockerfile and adds host.docker.internal when xdebug is on', () => {
    const services = provider.generateComposeServices({
      ...baseConfig,
      xdebugEnabled: true,
    });
    const wp = services['wordpress']!;
    expect(wp.image).toBeUndefined();
    expect(wp.build).toEqual({
      context: '/tmp/kiqr/projects/uuid',
      dockerfile: 'xdebug.Dockerfile',
    });
    expect(wp.extra_hosts).toContain('my-theme.test.lvh.me:host-gateway');
    expect(wp.extra_hosts).toContain('host.docker.internal:host-gateway');
  });

  it('leaves the other services unchanged when xdebug is on', () => {
    const services = provider.generateComposeServices({
      ...baseConfig,
      xdebugEnabled: true,
    });
    expect(services['wpcli']!.image).toBe('wordpress:cli-php8.3');
    expect(services['mariadb']!.image).toBe('mariadb:11.4');
    expect(services['phpmyadmin']!.image).toBe('phpmyadmin:5.2');
    expect(services['wpcli']!.build).toBeUndefined();
  });
});
