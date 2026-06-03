export interface ComposeService {
  image: string;
  environment?: Record<string, string>;
  volumes?: string[];
  labels?: string[];
  networks?: string[];
  depends_on?: string[];
  restart?: string;
}

export interface RuntimeConfig {
  projectSlug: string;
  themePath: string;
  themeSlug: string;
  hostname: string;
  phpMyAdminHostname: string;
  dbPassword: string;
  loginSecret: string;
  muPluginPath: string;
  dataDir: string;
}

export interface DatabaseCredentials {
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

export interface RuntimeProvider {
  getWordPressImage(version: string, phpVersion: string): string;
  getThemeMountTarget(themeSlug: string): string;
  getEnvironmentVariables(credentials: DatabaseCredentials): Record<string, string>;
  generateComposeServices(config: RuntimeConfig): Record<string, ComposeService>;
}
