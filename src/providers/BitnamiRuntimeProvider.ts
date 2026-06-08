import type {
  ComposeService,
  DatabaseCredentials,
  RuntimeConfig,
  RuntimeProvider,
} from './RuntimeProvider.js';

const KIQR_NETWORK = 'kiqr';

export class BitnamiRuntimeProvider implements RuntimeProvider {
  getWordPressImage(version: string, phpVersion: string): string {
    // The official `wordpress` image publishes PHP-pinned tags:
    //   - `wordpress:php8.3` for the latest WordPress on a given PHP version
    //   - `wordpress:6.7-php8.3` for a specific WordPress + PHP combination
    // See https://hub.docker.com/_/wordpress/tags
    if (version === 'latest') return `wordpress:php${phpVersion}`;
    return `wordpress:${version}-php${phpVersion}`;
  }

  getThemeMountTarget(themeSlug: string): string {
    return `/var/www/html/wp-content/themes/${themeSlug}`;
  }

  getEnvironmentVariables(credentials: DatabaseCredentials): Record<string, string> {
    return {
      WORDPRESS_DB_HOST: 'mariadb',
      WORDPRESS_DB_NAME: credentials.dbName,
      WORDPRESS_DB_USER: credentials.dbUser,
      WORDPRESS_DB_PASSWORD: credentials.dbPassword,
      // WordPress generates absolute URLs (links, asset/script tags, redirects)
      // from WP_HOME / WP_SITEURL. We derive them dynamically from the incoming
      // request so the site works under both its local hostname and a public
      // Cloudflare tunnel (`kiqr share`) without reconfiguring anything.
      //
      // WordPress generates absolute asset/link/redirect URLs from WP_HOME /
      // WP_SITEURL. We derive both *per request* so the site works under its
      // local hostname AND under a `kiqr share` Cloudflare tunnel without
      // reconfiguration.
      //
      // Signals, in priority order:
      //
      // 1. `/tmp/kiqr-share-url`: while `kiqr share` is active, the share
      //    command writes the public tunnel URL here via `docker exec`. We
      //    honor it only when `X-Forwarded-Proto` is `https` (i.e. the
      //    request came through an HTTPS proxy -- Traefik sets this to
      //    `http` for direct local requests, so local browsing during a
      //    share session still gets local URLs). When honored we ALSO
      //    rewrite `$_SERVER['HTTP_HOST']` to the tunnel host, otherwise
      //    WordPress's canonical-URL guard sees Host=local but WP_HOME=tunnel
      //    and 301-redirects to itself in an infinite loop. This is the only
      //    way to know the public hostname: cloudflared's `--http-host-header`
      //    rewrites Host for Traefik routing and quick tunnels don't expose
      //    the original anywhere downstream.
      //
      // 2. `X-Forwarded-Host` / `X-Forwarded-Proto`: standard reverse-proxy
      //    signals (Traefik will preserve these once trustedIPs is set on the
      //    web entrypoint -- see src/lib/agent.ts).
      //
      // 3. `HTTP_HOST` + plain http: the normal local path.
      //
      // We also forge `$_SERVER['HTTPS']` and `SERVER_PORT` when the resolved
      // scheme is https, so `is_ssl()` returns true. Defining WP_HOME alone
      // isn't enough -- themes/plugins routinely build URLs by branching on
      // is_ssl() rather than going through home_url(), and would emit http://
      // and trigger mixed-content blocking on the tunnel.
      //
      // We trust the forwarded headers and the share marker file
      // unconditionally because the WP container only listens on the internal
      // Docker `kiqr` network and the marker file is only writable from the
      // host's docker socket. If that listener topology ever changes this
      // becomes an injection vector and must be re-evaluated.
      //
      // X-Forwarded-Proto / X-Forwarded-Host may be comma-separated when
      // chained through multiple proxies -- take and trim the first value.
      //
      // This string is embedded verbatim into the docker-compose YAML, where
      // Compose treats `$` as an interpolation sigil. Every PHP `$` is written
      // as `$$` so Compose unescapes it back to a single `$` for PHP.
      WORDPRESS_CONFIG_EXTRA:
        "define('KIQR_DEVELOPMENT', true); " +
        "$$fwd_host = !empty($$_SERVER['HTTP_X_FORWARDED_HOST']) ? trim(explode(',', $$_SERVER['HTTP_X_FORWARDED_HOST'])[0]) : ''; " +
        "$$fwd_proto = !empty($$_SERVER['HTTP_X_FORWARDED_PROTO']) ? strtolower(trim(explode(',', $$_SERVER['HTTP_X_FORWARDED_PROTO'])[0])) : ''; " +
        "$$share_url = ($$fwd_proto === 'https' && is_readable('/tmp/kiqr-share-url')) ? trim(@file_get_contents('/tmp/kiqr-share-url')) : ''; " +
        "$$share_parts = $$share_url ? parse_url($$share_url) : false; " +
        "if (is_array($$share_parts) && !empty($$share_parts['host'])) { " +
        "  $$host = $$share_parts['host']; " +
        "  $$proto = strtolower($$share_parts['scheme'] ?? 'https'); " +
        "  $$_SERVER['HTTP_HOST'] = $$host; " +
        "} else { " +
        "  $$host = $$fwd_host ?: ($$_SERVER['HTTP_HOST'] ?? 'localhost'); " +
        "  $$proto = ($$fwd_proto === 'https') ? 'https' : 'http'; " +
        "} " +
        "if ($$proto === 'https') { $$_SERVER['HTTPS'] = 'on'; $$_SERVER['SERVER_PORT'] = 443; } " +
        "define('WP_HOME', $$proto . '://' . $$host); " +
        "define('WP_SITEURL', $$proto . '://' . $$host);",
    };
  }

  generateComposeServices(config: RuntimeConfig): Record<string, ComposeService> {
    const credentials: DatabaseCredentials = {
      dbName: 'wordpress',
      dbUser: 'wordpress',
      dbPassword: config.dbPassword,
    };

    return {
      wordpress: {
        image: this.getWordPressImage(config.wordpressVersion, config.phpVersion),
        environment: {
          ...this.getEnvironmentVariables(credentials),
          KIQR_LOGIN_SECRET: config.loginSecret,
          KIQR_THEME_SLUG: config.themeSlug,
          KIQR_LIVERELOAD_PORT: '35729',
        },
        volumes: [
          `wordpress_data:/var/www/html`,
          `${config.themePath}:${this.getThemeMountTarget(config.themeSlug)}`,
          `${config.muPluginPath}:/var/www/html/wp-content/mu-plugins/kiqr-auto-login.php:ro`,
          // Apache conf overlay — SetEnv for forwarded HTTPS + a Rewrite that
          // pre-empts mod_dir's DirectorySlash 301 from sending tunneled
          // visitors to the local hostname. See src/lib/apache-conf.ts.
          `${config.apacheConfPath}:/etc/apache2/conf-enabled/kiqr-apache.conf:ro`,
          `${config.pluginsPath}:/var/www/html/wp-content/plugins`,
          `${config.uploadsPath}:/var/www/html/wp-content/uploads`,
        ],
        labels: [
          'traefik.enable=true',
          `traefik.http.routers.${config.projectSlug}-wp.rule=Host(\`${config.hostname}\`)`,
          `traefik.http.routers.${config.projectSlug}-wp.entrypoints=web`,
          `traefik.http.services.${config.projectSlug}-wp.loadbalancer.server.port=80`,
        ],
        extra_hosts: [`${config.hostname}:host-gateway`],
        networks: [KIQR_NETWORK, 'default'],
        depends_on: ['mariadb'],
        restart: 'unless-stopped',
      },
      mariadb: {
        image: 'mariadb:11.4',
        environment: {
          MARIADB_ROOT_PASSWORD: config.dbPassword,
          MARIADB_USER: credentials.dbUser,
          MARIADB_PASSWORD: credentials.dbPassword,
          MARIADB_DATABASE: credentials.dbName,
        },
        volumes: [`mariadb_data:/var/lib/mysql`],
        networks: ['default'],
        restart: 'unless-stopped',
      },
      wpcli: {
        image: `wordpress:cli-php${config.phpVersion}`,
        environment: {
          WORDPRESS_DB_HOST: 'mariadb',
          WORDPRESS_DB_NAME: credentials.dbName,
          WORDPRESS_DB_USER: credentials.dbUser,
          WORDPRESS_DB_PASSWORD: credentials.dbPassword,
        },
        volumes: [
          `wordpress_data:/var/www/html`,
          `${config.themePath}:${this.getThemeMountTarget(config.themeSlug)}`,
          `${config.pluginsPath}:/var/www/html/wp-content/plugins`,
          `${config.uploadsPath}:/var/www/html/wp-content/uploads`,
        ],
        networks: ['default'],
        depends_on: ['mariadb'],
        profiles: ['cli'],
        user: '33:33',
      },
      phpmyadmin: {
        image: 'phpmyadmin:5.2',
        environment: {
          PMA_HOST: 'mariadb',
          PMA_USER: 'root',
          PMA_PASSWORD: config.dbPassword,
          UPLOAD_LIMIT: '512M',
        },
        labels: [
          'traefik.enable=true',
          `traefik.http.routers.${config.projectSlug}-pma.rule=Host(\`${config.phpMyAdminHostname}\`)`,
          `traefik.http.routers.${config.projectSlug}-pma.entrypoints=web`,
          `traefik.http.services.${config.projectSlug}-pma.loadbalancer.server.port=80`,
        ],
        networks: [KIQR_NETWORK, 'default'],
        depends_on: ['mariadb'],
        restart: 'unless-stopped',
      },
    };
  }
}
