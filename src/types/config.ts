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
  created_at: string;
}
