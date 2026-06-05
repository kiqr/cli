import type {
  RuntimeProvider,
  RuntimeConfig,
  ComposeService,
  DatabaseCredentials,
} from './RuntimeProvider.js';

const KIQR_NETWORK = 'kiqr';

export class BitnamiRuntimeProvider implements RuntimeProvider {
  getWordPressImage(version: string, _phpVersion: string): string {
    if (version === 'latest') return 'wordpress:latest';
    return `wordpress:${version}`;
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
      WORDPRESS_CONFIG_EXTRA:
        "define('KIQR_DEVELOPMENT', true); " +
        "define('WP_HOME', 'http://' . $$_SERVER['HTTP_HOST']); " +
        "define('WP_SITEURL', 'http://' . $$_SERVER['HTTP_HOST']);",
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
        image: this.getWordPressImage(config.wordpressVersion, '8.3'),
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
        image: 'mariadb:latest',
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
        image: 'wordpress:cli',
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
        image: 'phpmyadmin:latest',
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
