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
      // When the request arrives through a tunnel, cloudflared forwards the
      // original public hostname as `X-Forwarded-Host` and the scheme as
      // `X-Forwarded-Proto`, while the actual `Host` header is rewritten to the
      // local Traefik route. So prefer the forwarded values when present, and
      // fall back to `HTTP_HOST` over plain http for normal local requests --
      // which keeps local behavior identical to before.
      //
      // This string is embedded verbatim into the docker-compose YAML, where
      // Compose treats `$` as an interpolation sigil. Every PHP `$` is written
      // as `$$` so Compose unescapes it back to a single `$` for PHP.
      WORDPRESS_CONFIG_EXTRA:
        "define('KIQR_DEVELOPMENT', true); " +
        "$$host = !empty($$_SERVER['HTTP_X_FORWARDED_HOST']) ? $$_SERVER['HTTP_X_FORWARDED_HOST'] : $$_SERVER['HTTP_HOST']; " +
        "$$proto = (isset($$_SERVER['HTTP_X_FORWARDED_PROTO']) && $$_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http'; " +
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
