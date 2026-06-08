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

    // Honors the public hostname carried out-of-band via /tmp/kiqr-share-url
    // when `kiqr share` is active, gated on X-Forwarded-Proto: https so
    // direct-local browsing during a share session still gets local URLs.
    // Cloudflared rewrites Host (for Traefik routing) and doesn't pass the
    // original anywhere downstream, so forwarded headers alone can't reveal
    // the public hostname.
    expect(extra).toContain("'/tmp/kiqr-share-url'");
    expect(extra).toContain('is_readable(');
    expect(extra).toContain('parse_url(');
    // Must rewrite HTTP_HOST when the share URL is in effect, otherwise
    // WordPress's canonical-URL guard sees Host=local + WP_HOME=tunnel and
    // 301-redirects into an infinite loop.
    expect(extra).toContain("$$_SERVER['HTTP_HOST'] = $$host");
    // Falls back to X-Forwarded-Host / -Proto (Traefik trustedIPs preserves
    // them for reverse-proxy setups other than the tunnel).
    expect(extra).toContain("$$_SERVER['HTTP_X_FORWARDED_HOST']");
    expect(extra).toContain("$$_SERVER['HTTP_HOST']");
    expect(extra).toContain("$$_SERVER['HTTP_X_FORWARDED_PROTO']");
    expect(extra).toContain("=== 'https'");
    // Defensive parsing of forwarded headers: comma-split for chained proxies,
    // trim whitespace, lowercase the scheme.
    expect(extra).toContain("explode(',', $$_SERVER['HTTP_X_FORWARDED_HOST'])");
    expect(extra).toContain("explode(',', $$_SERVER['HTTP_X_FORWARDED_PROTO'])");
    expect(extra).toContain('strtolower(');
    expect(extra).toContain('trim(');
    // Forge `$_SERVER['HTTPS']` and `SERVER_PORT` so WordPress's `is_ssl()`
    // returns true behind a TLS-terminating proxy -- without this, themes and
    // plugins that branch on is_ssl() emit http:// URLs and the browser mixed-
    // content-blocks CSS / images on the tunneled https page.
    expect(extra).toContain("$$_SERVER['HTTPS'] = 'on'");
    expect(extra).toContain("$$_SERVER['SERVER_PORT'] = 443");
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
      apacheConfPath: '/tmp/kiqr-apache.conf',
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
      apacheConfPath: '/tmp/kiqr-apache.conf',
      pluginsPath: '/tmp/plugins',
      uploadsPath: '/tmp/uploads',
      dataDir: '/tmp/kiqr/projects/uuid',
    });
    expect(services['wordpress']!.image).toBe('wordpress:php8.4');
    expect(services['wpcli']!.image).toBe('wordpress:cli-php8.4');
  });

  it('mounts the kiqr apache conf so mod_dir DirectorySlash plays nice with the tunnel', () => {
    // Without this overlay, Apache's mod_dir 301s tunneled `/wp-admin` to
    // http://<local-Host>/wp-admin/ -- a dead URL behind the https tunnel.
    const services = provider.generateComposeServices({
      projectSlug: 'my-theme',
      themePath: '/home/user/my-theme',
      themeSlug: 'my-theme',
      hostname: 'my-theme.lvh.me',
      phpMyAdminHostname: 'phpmyadmin.my-theme.lvh.me',
      wordpressVersion: 'latest',
      phpVersion: '8.3',
      dbPassword: 'test_password',
      loginSecret: 'secret123',
      muPluginPath: '/tmp/mu-plugin.php',
      apacheConfPath: '/tmp/kiqr-apache.conf',
      pluginsPath: '/tmp/plugins',
      uploadsPath: '/tmp/uploads',
      dataDir: '/tmp/kiqr/projects/uuid',
    });
    const volumes = services['wordpress']!.volumes!;
    expect(
      volumes.some((v) =>
        v.startsWith('/tmp/kiqr-apache.conf:/etc/apache2/conf-enabled/'),
      ),
    ).toBe(true);
  });
});
