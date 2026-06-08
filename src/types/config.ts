export interface ThemeInfo {
  name: string;
  slug: string;
  path: string;
}

export interface WordPressConfig {
  version: string;
  php_version: string;
}

export interface DevelopmentConfig {
  dynamic_urls: boolean;
}

export interface ProjectConfig {
  project_id: string;
  name: string;
  wordpress: WordPressConfig;
  development: DevelopmentConfig;
}

export interface LocalConfig {
  project_id: string;
  runtime: string;
  db_password: string;
  login_secret: string;
  wordpress_version?: string;
  // Whether Xdebug step-debugging is enabled. Machine-local because debugging
  // is a per-developer choice. Absent means off (backward compatible).
  xdebug?: boolean;
  created_at: string;
}
