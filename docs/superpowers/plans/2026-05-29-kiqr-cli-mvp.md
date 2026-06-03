# Kiqr CLI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first MVP of Kiqr CLI — a WordPress theme development tool that provides a local WordPress runtime via Docker, managed through two commands: `kiqr init` and `kiqr up`.

**Architecture:** Pastel (Ink-based) CLI with file-based command routing. Pure library functions in `src/lib/` for all logic (testable without UI). Ink components for rendering. RuntimeProvider abstraction for WordPress runtime (Bitnami first). Global Traefik reverse proxy shared across projects. Config split between shared `kiqr.yaml` (git) and machine-local config (user config dir).

**Tech Stack:** Node.js, TypeScript (strict, ESM), Pastel, Ink, @inkjs/ui, tsup, Zod, yaml, Docker, Docker Compose, Traefik, MariaDB, phpMyAdmin, Vitest

---

## File Map

```
package.json
tsconfig.json
tsup.config.ts
vitest.config.ts

src/
  cli.ts                              # Pastel entry point (hashbang, app.run())
  commands/
    init.tsx                           # kiqr init — project scaffolding
    up.tsx                             # kiqr up — start services
  components/
    StepRunner.tsx                     # Runs a list of async steps with spinner/status
  lib/
    docker.ts                         # isDockerInstalled(), isDockerRunning()
    config.ts                         # readProjectConfig(), writeProjectConfig(), readLocalConfig(), writeLocalConfig()
    paths.ts                          # getKiqrDataDir(), getProjectRuntimeDir()
    theme.ts                          # detectTheme() → { name, path } | null
    runtime.ts                        # RuntimeProvider interface re-export + factory
    traefik.ts                        # ensureTraefikRunning(), generateTraefikCompose()
    compose.ts                        # generateProjectCompose()
    ports.ts                          # reservePort()
    hostname.ts                       # getMachineHostname(), buildProjectHostname()
  providers/
    RuntimeProvider.ts                # Interface definition
    BitnamiRuntimeProvider.ts         # Bitnami WordPress implementation
  types/
    config.ts                         # ProjectConfig, LocalConfig, ThemeInfo types

tests/
  lib/
    theme.test.ts
    hostname.test.ts
    ports.test.ts
    paths.test.ts
    config.test.ts
    compose.test.ts
    traefik.test.ts
    docker.test.ts
  providers/
    BitnamiRuntimeProvider.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@kiqr/cli",
  "version": "0.1.0",
  "description": "Local WordPress theme development CLI",
  "type": "module",
  "bin": {
    "kiqr": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["wordpress", "theme", "cli", "docker", "development"],
  "license": "MIT",
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install pastel ink react zod yaml @inkjs/ui
npm install --save-dev typescript @types/react @sindresorhus/tsconfig tsup vitest @types/node
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "@sindresorhus/tsconfig",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create tsup.config.ts**

```typescript
import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
*.tgz
```

- [ ] **Step 7: Create minimal CLI entry point to verify build**

Create `src/cli.ts`:

```typescript
import Pastel from 'pastel';

const app = new Pastel({
  importMeta: import.meta,
});

await app.run();
```

Create `src/commands/index.tsx` (default command — placeholder):

```tsx
import React from 'react';
import {Text} from 'ink';

export const description = 'WordPress theme development CLI';

export default function Index() {
  return <Text>Kiqr CLI v0.1.0 — run "kiqr init" to get started.</Text>;
}
```

- [ ] **Step 8: Build and verify**

```bash
npm run build
node dist/cli.js
```

Expected: prints "Kiqr CLI v0.1.0 — run "kiqr init" to get started."

- [ ] **Step 9: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git init
git add package.json package-lock.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore src/cli.ts src/commands/index.tsx
git commit -m "chore: scaffold Kiqr CLI project with Pastel, Ink, tsup"
```

---

## Task 2: Types

**Files:**
- Create: `src/types/config.ts`

- [ ] **Step 1: Create config types**

```typescript
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
  hostname: string;
  port: number;
  runtime: string;
  created_at: string;
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/types/config.ts
git commit -m "feat: add TypeScript types for project and local config"
```

---

## Task 3: Platform Paths

**Files:**
- Create: `src/lib/paths.ts`
- Create: `tests/lib/paths.test.ts`

- [ ] **Step 1: Write tests for path resolution**

```typescript
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {getKiqrDataDir, getProjectRuntimeDir} from '../../src/lib/paths.js';

describe('getKiqrDataDir', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns macOS path on darwin', () => {
    vi.stubEnv('HOME', '/Users/testuser');
    const result = getKiqrDataDir('darwin');
    expect(result).toBe('/Users/testuser/Library/Application Support/Kiqr');
  });

  it('returns Linux path on linux', () => {
    vi.stubEnv('HOME', '/home/testuser');
    const result = getKiqrDataDir('linux');
    expect(result).toBe('/home/testuser/.config/kiqr');
  });

  it('returns Windows path when APPDATA is set', () => {
    vi.stubEnv('APPDATA', 'C:\\Users\\testuser\\AppData\\Roaming');
    const result = getKiqrDataDir('win32');
    expect(result).toBe('C:\\Users\\testuser\\AppData\\Roaming/Kiqr');
  });

  it('throws on unsupported platform', () => {
    expect(() => getKiqrDataDir('freebsd' as NodeJS.Platform)).toThrow();
  });
});

describe('getProjectRuntimeDir', () => {
  it('returns path under data dir with project id', () => {
    vi.stubEnv('HOME', '/Users/testuser');
    const result = getProjectRuntimeDir('abc-123', 'darwin');
    expect(result).toBe('/Users/testuser/Library/Application Support/Kiqr/projects/abc-123');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/paths.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement paths.ts**

```typescript
import path from 'node:path';

export function getKiqrDataDir(platform: NodeJS.Platform = process.platform): string {
  switch (platform) {
    case 'darwin': {
      const home = process.env['HOME'];
      if (!home) throw new Error('HOME environment variable is not set');
      return path.join(home, 'Library', 'Application Support', 'Kiqr');
    }
    case 'linux': {
      const home = process.env['HOME'];
      if (!home) throw new Error('HOME environment variable is not set');
      return path.join(home, '.config', 'kiqr');
    }
    case 'win32': {
      const appData = process.env['APPDATA'];
      if (!appData) throw new Error('APPDATA environment variable is not set');
      return path.join(appData, 'Kiqr');
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export function getProjectRuntimeDir(
  projectId: string,
  platform: NodeJS.Platform = process.platform,
): string {
  return path.join(getKiqrDataDir(platform), 'projects', projectId);
}

export function getTraefikDir(platform: NodeJS.Platform = process.platform): string {
  return path.join(getKiqrDataDir(platform), 'traefik');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/paths.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/paths.ts tests/lib/paths.test.ts
git commit -m "feat: add platform-specific path resolution"
```

---

## Task 4: Theme Detection

**Files:**
- Create: `src/lib/theme.ts`
- Create: `tests/lib/theme.test.ts`

- [ ] **Step 1: Write tests for theme detection**

```typescript
import {describe, it, expect} from 'vitest';
import {parseThemeName, slugify} from '../../src/lib/theme.js';

describe('parseThemeName', () => {
  it('extracts theme name from valid style.css content', () => {
    const css = `/*\nTheme Name: My Awesome Theme\n*/`;
    expect(parseThemeName(css)).toBe('My Awesome Theme');
  });

  it('returns null when Theme Name header is missing', () => {
    const css = `/* just a comment */\nbody { color: red; }`;
    expect(parseThemeName(css)).toBeNull();
  });

  it('handles extra whitespace around Theme Name', () => {
    const css = `/*\n  Theme Name:   Spacey Theme  \n*/`;
    expect(parseThemeName(css)).toBe('Spacey Theme');
  });

  it('handles Theme Name not inside a block comment', () => {
    const css = `Theme Name: Bare Theme\nbody {}`;
    expect(parseThemeName(css)).toBe('Bare Theme');
  });
});

describe('slugify', () => {
  it('converts name to lowercase slug', () => {
    expect(slugify('My Awesome Theme')).toBe('my-awesome-theme');
  });

  it('handles special characters', () => {
    expect(slugify("Bob's Theme (v2)")).toBe('bobs-theme-v2');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('Theme -- Name')).toBe('theme-name');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/theme.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement theme.ts**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type {ThemeInfo} from '../types/config.js';

export function parseThemeName(css: string): string | null {
  const match = css.match(/Theme Name:\s*(.+)/i);
  if (!match?.[1]) return null;
  return match[1].trim();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function detectTheme(dir: string = process.cwd()): ThemeInfo | null {
  const stylePath = path.join(dir, 'style.css');

  if (!fs.existsSync(stylePath)) return null;

  const content = fs.readFileSync(stylePath, 'utf-8');
  const name = parseThemeName(content);

  if (!name) return null;

  return {
    name,
    slug: slugify(name),
    path: dir,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/theme.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts tests/lib/theme.test.ts
git commit -m "feat: add WordPress theme detection and validation"
```

---

## Task 5: Docker Checks

**Files:**
- Create: `src/lib/docker.ts`
- Create: `tests/lib/docker.test.ts`

- [ ] **Step 1: Write tests for Docker checks**

```typescript
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {isDockerInstalled, isDockerRunning} from '../../src/lib/docker.js';
import {execSync} from 'node:child_process';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe('isDockerInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when docker command succeeds', () => {
    mockExecSync.mockReturnValueOnce(Buffer.from('Docker version 24.0.0'));
    expect(isDockerInstalled()).toBe(true);
  });

  it('returns false when docker command fails', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('command not found');
    });
    expect(isDockerInstalled()).toBe(false);
  });
});

describe('isDockerRunning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when docker info succeeds', () => {
    mockExecSync.mockReturnValueOnce(Buffer.from(''));
    expect(isDockerRunning()).toBe(true);
  });

  it('returns false when docker info fails', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('Cannot connect');
    });
    expect(isDockerRunning()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/docker.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement docker.ts**

```typescript
import {execSync} from 'node:child_process';

export function isDockerInstalled(): boolean {
  try {
    execSync('docker --version', {stdio: 'pipe'});
    return true;
  } catch {
    return false;
  }
}

export function isDockerRunning(): boolean {
  try {
    execSync('docker info', {stdio: 'pipe'});
    return true;
  } catch {
    return false;
  }
}

export function runDockerCompose(
  composeFile: string,
  command: string,
  args: string[] = [],
): void {
  execSync(`docker compose -f ${composeFile} ${command} ${args.join(' ')}`, {
    stdio: 'pipe',
  });
}

export function isContainerRunning(name: string): boolean {
  try {
    const output = execSync(
      `docker ps --filter "name=${name}" --filter "status=running" --format "{{.Names}}"`,
      {stdio: 'pipe'},
    ).toString().trim();
    return output.includes(name);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/docker.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/docker.ts tests/lib/docker.test.ts
git commit -m "feat: add Docker installation and status checks"
```

---

## Task 6: Hostname Generation

**Files:**
- Create: `src/lib/hostname.ts`
- Create: `tests/lib/hostname.test.ts`

- [ ] **Step 1: Write tests for hostname logic**

```typescript
import {describe, it, expect, vi} from 'vitest';
import {sanitizeHostname, buildProjectHostname} from '../../src/lib/hostname.js';
import os from 'node:os';

vi.mock('node:os', () => ({
  default: {hostname: vi.fn()},
  hostname: vi.fn(),
}));

const mockHostname = vi.mocked(os.hostname);

describe('sanitizeHostname', () => {
  it('lowercases and strips .local suffix', () => {
    expect(sanitizeHostname('Rasmus-MacBook.local')).toBe('rasmus-macbook');
  });

  it('removes invalid characters', () => {
    expect(sanitizeHostname("Anna's Laptop!")).toBe('annas-laptop');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeHostname('my--host--name')).toBe('my-host-name');
  });

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeHostname('-host-')).toBe('host');
  });
});

describe('buildProjectHostname', () => {
  it('combines project slug with machine hostname', () => {
    mockHostname.mockReturnValue('rasmus-macbook.local');
    expect(buildProjectHostname('my-theme')).toBe('my-theme.rasmus-macbook.local');
  });

  it('builds phpmyadmin subdomain', () => {
    mockHostname.mockReturnValue('rasmus-macbook.local');
    expect(buildProjectHostname('my-theme', 'phpmyadmin')).toBe(
      'phpmyadmin.my-theme.rasmus-macbook.local',
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/hostname.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement hostname.ts**

```typescript
import os from 'node:os';

export function getMachineHostname(): string {
  return sanitizeHostname(os.hostname());
}

export function sanitizeHostname(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\.local$/, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildProjectHostname(
  projectSlug: string,
  subdomain?: string,
): string {
  const machine = getMachineHostname();
  const base = `${projectSlug}.${machine}.local`;
  if (subdomain) {
    return `${subdomain}.${base}`;
  }
  return base;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/hostname.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/hostname.ts tests/lib/hostname.test.ts
git commit -m "feat: add hostname detection and project hostname generation"
```

---

## Task 7: Port Reservation

**Files:**
- Create: `src/lib/ports.ts`
- Create: `tests/lib/ports.test.ts`

- [ ] **Step 1: Write tests for port reservation**

```typescript
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {findAvailablePort, isPortAvailable} from '../../src/lib/ports.js';
import net from 'node:net';

describe('isPortAvailable', () => {
  it('returns true for an available port', async () => {
    const result = await isPortAvailable(0);
    expect(result).toBe(true);
  });
});

describe('findAvailablePort', () => {
  it('returns a port in the valid range', async () => {
    const port = await findAvailablePort(10000, 10100);
    expect(port).toBeGreaterThanOrEqual(10000);
    expect(port).toBeLessThanOrEqual(10100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/ports.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement ports.ts**

```typescript
import net from 'node:net';

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

export async function findAvailablePort(
  rangeStart: number = 10000,
  rangeEnd: number = 20000,
): Promise<number> {
  for (let port = rangeStart; port <= rangeEnd; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${rangeStart}-${rangeEnd}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/ports.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ports.ts tests/lib/ports.test.ts
git commit -m "feat: add port availability checking and reservation"
```

---

## Task 8: Config Management

**Files:**
- Create: `src/lib/config.ts`
- Create: `tests/lib/config.test.ts`

- [ ] **Step 1: Write tests for config read/write**

```typescript
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  readProjectConfig,
  writeProjectConfig,
  readLocalConfig,
  writeLocalConfig,
  projectConfigExists,
} from '../../src/lib/config.js';
import type {ProjectConfig, LocalConfig} from '../../src/types/config.js';

describe('project config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('writes and reads kiqr.yaml', () => {
    const config: ProjectConfig = {
      project_id: 'test-uuid',
      name: 'my-theme',
      wordpress: {version: 'latest', php_version: '8.3'},
      development: {dynamic_urls: true},
    };

    writeProjectConfig(config, tmpDir);
    expect(projectConfigExists(tmpDir)).toBe(true);

    const loaded = readProjectConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  it('returns null when kiqr.yaml does not exist', () => {
    expect(readProjectConfig(tmpDir)).toBeNull();
  });
});

describe('local config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-local-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('writes and reads local config', () => {
    const config: LocalConfig = {
      project_id: 'test-uuid',
      hostname: 'my-theme.test-machine.local',
      port: 12345,
      runtime: 'bitnami',
      created_at: '2026-05-29T00:00:00Z',
    };

    writeLocalConfig(config, tmpDir);

    const loaded = readLocalConfig(tmpDir);
    expect(loaded).toEqual(config);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/config.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement config.ts**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type {ProjectConfig, LocalConfig} from '../types/config.js';

const PROJECT_CONFIG_FILE = 'kiqr.yaml';
const LOCAL_CONFIG_FILE = 'config.yaml';

export function projectConfigExists(dir: string = process.cwd()): boolean {
  return fs.existsSync(path.join(dir, PROJECT_CONFIG_FILE));
}

export function readProjectConfig(dir: string = process.cwd()): ProjectConfig | null {
  const filePath = path.join(dir, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as ProjectConfig;
}

export function writeProjectConfig(config: ProjectConfig, dir: string = process.cwd()): void {
  const filePath = path.join(dir, PROJECT_CONFIG_FILE);
  fs.writeFileSync(filePath, YAML.stringify(config), 'utf-8');
}

export function readLocalConfig(dir: string): LocalConfig | null {
  const filePath = path.join(dir, LOCAL_CONFIG_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as LocalConfig;
}

export function writeLocalConfig(config: LocalConfig, dir: string): void {
  fs.mkdirSync(dir, {recursive: true});
  const filePath = path.join(dir, LOCAL_CONFIG_FILE);
  fs.writeFileSync(filePath, YAML.stringify(config), 'utf-8');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/config.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts tests/lib/config.test.ts
git commit -m "feat: add YAML config read/write for project and local configs"
```

---

## Task 9: Runtime Provider

**Files:**
- Create: `src/providers/RuntimeProvider.ts`
- Create: `src/providers/BitnamiRuntimeProvider.ts`
- Create: `src/lib/runtime.ts`
- Create: `tests/providers/BitnamiRuntimeProvider.test.ts`

- [ ] **Step 1: Write tests for BitnamiRuntimeProvider**

```typescript
import {describe, it, expect} from 'vitest';
import {BitnamiRuntimeProvider} from '../../src/providers/BitnamiRuntimeProvider.js';

describe('BitnamiRuntimeProvider', () => {
  const provider = new BitnamiRuntimeProvider();

  it('returns wordpress image name', () => {
    const image = provider.getWordPressImage('latest', '8.3');
    expect(image).toContain('bitnami/wordpress');
  });

  it('returns correct theme mount target', () => {
    const mount = provider.getThemeMountTarget('my-theme');
    expect(mount).toBe('/bitnami/wordpress/wp-content/themes/my-theme');
  });

  it('returns environment variables with KIQR_DEVELOPMENT', () => {
    const env = provider.getEnvironmentVariables({
      dbName: 'wordpress',
      dbUser: 'bn_wordpress',
      dbPassword: 'wordpress_password',
    });
    expect(env['WORDPRESS_DATABASE_NAME']).toBe('wordpress');
    expect(env['WORDPRESS_SKIP_BOOTSTRAP']).toBe('no');
  });

  it('returns compose services definition', () => {
    const services = provider.generateComposeServices({
      projectSlug: 'my-theme',
      themePath: '/home/user/my-theme',
      themeSlug: 'my-theme',
      hostname: 'my-theme.test.local',
      phpMyAdminHostname: 'phpmyadmin.my-theme.test.local',
      dbPassword: 'test_password',
      dataDir: '/tmp/kiqr/projects/uuid',
    });
    expect(services['wordpress']).toBeDefined();
    expect(services['mariadb']).toBeDefined();
    expect(services['phpmyadmin']).toBeDefined();
    expect(services['wordpress']!.image).toContain('bitnami/wordpress');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/providers/BitnamiRuntimeProvider.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement RuntimeProvider interface**

```typescript
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
```

- [ ] **Step 4: Implement BitnamiRuntimeProvider**

```typescript
import type {
  RuntimeProvider,
  RuntimeConfig,
  ComposeService,
  DatabaseCredentials,
} from './RuntimeProvider.js';

const TRAEFIK_NETWORK = 'kiqr-proxy';

export class BitnamiRuntimeProvider implements RuntimeProvider {
  getWordPressImage(version: string, _phpVersion: string): string {
    if (version === 'latest') return 'bitnami/wordpress:latest';
    return `bitnami/wordpress:${version}`;
  }

  getThemeMountTarget(themeSlug: string): string {
    return `/bitnami/wordpress/wp-content/themes/${themeSlug}`;
  }

  getEnvironmentVariables(credentials: DatabaseCredentials): Record<string, string> {
    return {
      WORDPRESS_DATABASE_HOST: 'mariadb',
      WORDPRESS_DATABASE_PORT_NUMBER: '3306',
      WORDPRESS_DATABASE_NAME: credentials.dbName,
      WORDPRESS_DATABASE_USER: credentials.dbUser,
      WORDPRESS_DATABASE_PASSWORD: credentials.dbPassword,
      WORDPRESS_SKIP_BOOTSTRAP: 'no',
      WORDPRESS_USERNAME: 'admin',
      WORDPRESS_PASSWORD: 'admin',
      WORDPRESS_BLOG_NAME: 'Kiqr Development',
      WORDPRESS_EXTRA_PHP_CONFIG: [
        "define('KIQR_DEVELOPMENT', true);",
        "$host = $_SERVER['HTTP_HOST'] ?? 'localhost';",
        "$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';",
        "define('WP_HOME', $scheme . '://' . $host);",
        "define('WP_SITEURL', $scheme . '://' . $host);",
      ].join('\n'),
    };
  }

  generateComposeServices(config: RuntimeConfig): Record<string, ComposeService> {
    const credentials: DatabaseCredentials = {
      dbName: 'wordpress',
      dbUser: 'bn_wordpress',
      dbPassword: config.dbPassword,
    };

    return {
      wordpress: {
        image: this.getWordPressImage('latest', '8.3'),
        environment: this.getEnvironmentVariables(credentials),
        volumes: [
          `${config.themePath}:${this.getThemeMountTarget(config.themeSlug)}`,
          `wordpress_data:/bitnami/wordpress`,
        ],
        labels: [
          'traefik.enable=true',
          `traefik.http.routers.${config.projectSlug}-wp.rule=Host(\`${config.hostname}\`)`,
          `traefik.http.routers.${config.projectSlug}-wp.entrypoints=web`,
          `traefik.http.services.${config.projectSlug}-wp.loadbalancer.server.port=8080`,
        ],
        networks: [TRAEFIK_NETWORK, 'default'],
        depends_on: ['mariadb'],
        restart: 'unless-stopped',
      },
      mariadb: {
        image: 'bitnami/mariadb:latest',
        environment: {
          MARIADB_ROOT_PASSWORD: config.dbPassword,
          MARIADB_USER: credentials.dbUser,
          MARIADB_PASSWORD: credentials.dbPassword,
          MARIADB_DATABASE: credentials.dbName,
          MARIADB_CHARACTER_SET: 'utf8mb4',
          MARIADB_COLLATE: 'utf8mb4_unicode_ci',
        },
        volumes: [`mariadb_data:/bitnami/mariadb`],
        networks: ['default'],
        restart: 'unless-stopped',
      },
      phpmyadmin: {
        image: 'phpmyadmin:latest',
        environment: {
          PMA_HOST: 'mariadb',
          PMA_PORT: '3306',
          MYSQL_ROOT_PASSWORD: config.dbPassword,
        },
        labels: [
          'traefik.enable=true',
          `traefik.http.routers.${config.projectSlug}-pma.rule=Host(\`${config.phpMyAdminHostname}\`)`,
          `traefik.http.routers.${config.projectSlug}-pma.entrypoints=web`,
          `traefik.http.services.${config.projectSlug}-pma.loadbalancer.server.port=80`,
        ],
        networks: [TRAEFIK_NETWORK, 'default'],
        depends_on: ['mariadb'],
        restart: 'unless-stopped',
      },
    };
  }
}
```

- [ ] **Step 5: Implement runtime.ts factory**

```typescript
import type {RuntimeProvider} from '../providers/RuntimeProvider.js';
import {BitnamiRuntimeProvider} from '../providers/BitnamiRuntimeProvider.js';

export type {RuntimeProvider} from '../providers/RuntimeProvider.js';
export type {RuntimeConfig, ComposeService} from '../providers/RuntimeProvider.js';

export function createRuntimeProvider(runtime: string = 'bitnami'): RuntimeProvider {
  switch (runtime) {
    case 'bitnami':
      return new BitnamiRuntimeProvider();
    default:
      throw new Error(`Unknown runtime provider: ${runtime}`);
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- tests/providers/BitnamiRuntimeProvider.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/providers/RuntimeProvider.ts src/providers/BitnamiRuntimeProvider.ts src/lib/runtime.ts tests/providers/BitnamiRuntimeProvider.test.ts
git commit -m "feat: add RuntimeProvider abstraction with Bitnami implementation"
```

---

## Task 10: Compose File Generation

**Files:**
- Create: `src/lib/compose.ts`
- Create: `tests/lib/compose.test.ts`

- [ ] **Step 1: Write tests for compose generation**

```typescript
import {describe, it, expect} from 'vitest';
import {generateProjectCompose, parseComposeYaml} from '../../src/lib/compose.js';
import type {RuntimeConfig} from '../../src/providers/RuntimeProvider.js';
import YAML from 'yaml';

describe('generateProjectCompose', () => {
  const config: RuntimeConfig = {
    projectSlug: 'my-theme',
    themePath: '/home/user/my-theme',
    themeSlug: 'my-theme',
    hostname: 'my-theme.test.local',
    phpMyAdminHostname: 'phpmyadmin.my-theme.test.local',
    dbPassword: 'test_password',
    dataDir: '/tmp/kiqr/projects/uuid',
  };

  it('generates valid YAML with all three services', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    expect(parsed.services.wordpress).toBeDefined();
    expect(parsed.services.mariadb).toBeDefined();
    expect(parsed.services.phpmyadmin).toBeDefined();
  });

  it('includes the kiqr-proxy external network', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    expect(parsed.networks['kiqr-proxy']).toEqual({external: true});
  });

  it('includes named volumes', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    expect(parsed.volumes).toHaveProperty('wordpress_data');
    expect(parsed.volumes).toHaveProperty('mariadb_data');
  });

  it('mounts the theme directory into wordpress', () => {
    const yaml = generateProjectCompose(config);
    const parsed = YAML.parse(yaml);
    const wpVolumes = parsed.services.wordpress.volumes;
    expect(wpVolumes.some((v: string) => v.includes('/home/user/my-theme'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/compose.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement compose.ts**

```typescript
import YAML from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import type {RuntimeConfig} from '../providers/RuntimeProvider.js';
import {createRuntimeProvider} from './runtime.js';

const TRAEFIK_NETWORK = 'kiqr-proxy';

export function generateProjectCompose(
  config: RuntimeConfig,
  runtime: string = 'bitnami',
): string {
  const provider = createRuntimeProvider(runtime);
  const services = provider.generateComposeServices(config);

  const compose = {
    services,
    networks: {
      [TRAEFIK_NETWORK]: {external: true},
      default: {},
    },
    volumes: {
      wordpress_data: {},
      mariadb_data: {},
    },
  };

  return YAML.stringify(compose);
}

export function writeProjectCompose(config: RuntimeConfig, outputDir: string): string {
  const yaml = generateProjectCompose(config);
  const filePath = path.join(outputDir, 'compose.yaml');
  fs.mkdirSync(outputDir, {recursive: true});
  fs.writeFileSync(filePath, yaml, 'utf-8');
  return filePath;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/compose.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/compose.ts tests/lib/compose.test.ts
git commit -m "feat: add Docker Compose file generation for project services"
```

---

## Task 11: Traefik Management

**Files:**
- Create: `src/lib/traefik.ts`
- Create: `tests/lib/traefik.test.ts`

- [ ] **Step 1: Write tests for Traefik compose generation**

```typescript
import {describe, it, expect} from 'vitest';
import {generateTraefikCompose} from '../../src/lib/traefik.js';
import YAML from 'yaml';

describe('generateTraefikCompose', () => {
  it('generates valid compose YAML for Traefik', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    expect(parsed.services.traefik).toBeDefined();
    expect(parsed.services.traefik.image).toContain('traefik');
  });

  it('exposes port 7000', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    const ports = parsed.services.traefik.ports;
    expect(ports.some((p: string) => p.includes('7000'))).toBe(true);
  });

  it('creates kiqr-proxy network', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    expect(parsed.networks['kiqr-proxy']).toBeDefined();
  });

  it('mounts Docker socket', () => {
    const yaml = generateTraefikCompose();
    const parsed = YAML.parse(yaml);
    const volumes = parsed.services.traefik.volumes;
    expect(volumes.some((v: string) => v.includes('docker.sock'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/traefik.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement traefik.ts**

```typescript
import YAML from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import {getTraefikDir} from './paths.js';
import {isContainerRunning, runDockerCompose} from './docker.js';

const TRAEFIK_NETWORK = 'kiqr-proxy';
const TRAEFIK_CONTAINER = 'kiqr-traefik';

export function generateTraefikCompose(): string {
  const compose = {
    services: {
      traefik: {
        image: 'traefik:v3.4',
        container_name: TRAEFIK_CONTAINER,
        command: [
          '--providers.docker=true',
          '--providers.docker.exposedbydefault=false',
          `--providers.docker.network=${TRAEFIK_NETWORK}`,
          '--entrypoints.web.address=:7000',
          '--api.insecure=true',
        ],
        ports: ['7000:7000', '8080:8080'],
        volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
        networks: [TRAEFIK_NETWORK],
        restart: 'unless-stopped',
      },
    },
    networks: {
      [TRAEFIK_NETWORK]: {
        name: TRAEFIK_NETWORK,
      },
    },
  };

  return YAML.stringify(compose);
}

export function writeTraefikCompose(dir?: string): string {
  const traefikDir = dir ?? getTraefikDir();
  const filePath = path.join(traefikDir, 'compose.yaml');
  fs.mkdirSync(traefikDir, {recursive: true});
  fs.writeFileSync(filePath, generateTraefikCompose(), 'utf-8');
  return filePath;
}

export function isTraefikRunning(): boolean {
  return isContainerRunning(TRAEFIK_CONTAINER);
}

export function ensureTraefikRunning(dir?: string): void {
  if (isTraefikRunning()) return;
  const traefikDir = dir ?? getTraefikDir();
  const composePath = writeTraefikCompose(traefikDir);
  ensureTraefikNetwork();
  runDockerCompose(composePath, 'up', ['-d']);
}

function ensureTraefikNetwork(): void {
  try {
    const {execSync} = await import('node:child_process');
    execSync(`docker network create ${TRAEFIK_NETWORK}`, {stdio: 'pipe'});
  } catch {
    // Network may already exist
  }
}
```

Wait — that uses top-level `await import` inside a function which is not valid. Let me fix:

```typescript
import YAML from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {getTraefikDir} from './paths.js';
import {isContainerRunning, runDockerCompose} from './docker.js';

const TRAEFIK_NETWORK = 'kiqr-proxy';
const TRAEFIK_CONTAINER = 'kiqr-traefik';

export function generateTraefikCompose(): string {
  const compose = {
    services: {
      traefik: {
        image: 'traefik:v3.4',
        container_name: TRAEFIK_CONTAINER,
        command: [
          '--providers.docker=true',
          '--providers.docker.exposedbydefault=false',
          `--providers.docker.network=${TRAEFIK_NETWORK}`,
          '--entrypoints.web.address=:7000',
          '--api.insecure=true',
        ],
        ports: ['7000:7000', '8080:8080'],
        volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
        networks: [TRAEFIK_NETWORK],
        restart: 'unless-stopped',
      },
    },
    networks: {
      [TRAEFIK_NETWORK]: {
        name: TRAEFIK_NETWORK,
      },
    },
  };

  return YAML.stringify(compose);
}

export function writeTraefikCompose(dir?: string): string {
  const traefikDir = dir ?? getTraefikDir();
  const filePath = path.join(traefikDir, 'compose.yaml');
  fs.mkdirSync(traefikDir, {recursive: true});
  fs.writeFileSync(filePath, generateTraefikCompose(), 'utf-8');
  return filePath;
}

export function isTraefikRunning(): boolean {
  return isContainerRunning(TRAEFIK_CONTAINER);
}

export function ensureTraefikRunning(dir?: string): void {
  if (isTraefikRunning()) return;
  const traefikDir = dir ?? getTraefikDir();
  const composePath = writeTraefikCompose(traefikDir);
  ensureTraefikNetwork();
  runDockerCompose(composePath, 'up', ['-d']);
}

function ensureTraefikNetwork(): void {
  try {
    execSync(`docker network create ${TRAEFIK_NETWORK}`, {stdio: 'pipe'});
  } catch {
    // Network may already exist
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/traefik.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/traefik.ts tests/lib/traefik.test.ts
git commit -m "feat: add Traefik compose generation and lifecycle management"
```

---

## Task 12: StepRunner Component

**Files:**
- Create: `src/components/StepRunner.tsx`

This is the core UI component that both commands use. It takes a list of named async steps, runs them sequentially, shows a spinner for the current step, and checkmarks for completed steps.

- [ ] **Step 1: Implement StepRunner component**

```tsx
import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {Spinner, StatusMessage} from '@inkjs/ui';

export interface Step {
  label: string;
  run: () => Promise<void>;
}

interface StepRunnerProps {
  steps: Step[];
  onComplete?: () => void;
  onError?: (error: Error, stepLabel: string) => void;
}

export default function StepRunner({steps, onComplete, onError}: StepRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState<{message: string; step: string} | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || error || currentIndex >= steps.length) return;

    const step = steps[currentIndex]!;
    let cancelled = false;

    (async () => {
      try {
        await step.run();
        if (cancelled) return;
        setCompletedSteps((prev) => [...prev, step.label]);
        if (currentIndex + 1 >= steps.length) {
          setDone(true);
          onComplete?.();
        } else {
          setCurrentIndex((i) => i + 1);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError({message, step: step.label});
        onError?.(err instanceof Error ? err : new Error(message), step.label);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentIndex, done, error]);

  return (
    <Box flexDirection="column" paddingTop={1}>
      {completedSteps.map((label) => (
        <StatusMessage key={label} variant="success">
          {label}
        </StatusMessage>
      ))}

      {!done && !error && currentIndex < steps.length && (
        <Spinner label={steps[currentIndex]!.label} />
      )}

      {error && (
        <Box flexDirection="column">
          <StatusMessage variant="error">{error.step}</StatusMessage>
          <Box marginLeft={2} marginTop={1}>
            <Text color="red">{error.message}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Build and verify typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/StepRunner.tsx
git commit -m "feat: add StepRunner component for sequential async step UI"
```

---

## Task 13: Init Command

**Files:**
- Create: `src/commands/init.tsx`

- [ ] **Step 1: Implement the init command**

```tsx
import React from 'react';
import {Box, Text} from 'ink';
import {useApp} from 'ink';
import {randomUUID} from 'node:crypto';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {isDockerInstalled, isDockerRunning} from '../lib/docker.js';
import {detectTheme} from '../lib/theme.js';
import {projectConfigExists, writeProjectConfig, writeLocalConfig} from '../lib/config.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {findAvailablePort} from '../lib/ports.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {writeTraefikCompose} from '../lib/traefik.js';
import {writeProjectCompose} from '../lib/compose.js';
import type {ProjectConfig, LocalConfig, ThemeInfo} from '../types/config.js';

export const description = 'Initialize a new Kiqr project in the current directory';

export default function Init() {
  const {exit} = useApp();

  let theme: ThemeInfo;
  let projectId: string;
  let hostname: string;
  let phpMyAdminHostname: string;
  let port: number;

  const steps: Step[] = [
    {
      label: 'Checking Docker...',
      run: async () => {
        if (!isDockerInstalled()) {
          throw new Error(
            'Docker is not installed. Please install Docker Desktop from https://docker.com',
          );
        }
        if (!isDockerRunning()) {
          throw new Error(
            'Docker is not running. Please start Docker Desktop and try again.',
          );
        }
      },
    },
    {
      label: 'Checking theme...',
      run: async () => {
        const detected = detectTheme();
        if (!detected) {
          throw new Error(
            'This folder does not appear to be a WordPress theme.\n' +
            'Make sure you have a style.css file with a "Theme Name:" header.',
          );
        }
        theme = detected;
      },
    },
    {
      label: 'Checking project...',
      run: async () => {
        if (projectConfigExists()) {
          throw new Error(
            'This project is already initialized. A kiqr.yaml file already exists.',
          );
        }
      },
    },
    {
      label: 'Creating project configuration...',
      run: async () => {
        projectId = randomUUID();
        hostname = buildProjectHostname(theme.slug);
        phpMyAdminHostname = buildProjectHostname(theme.slug, 'phpmyadmin');
        port = await findAvailablePort();

        const projectConfig: ProjectConfig = {
          project_id: projectId,
          name: theme.slug,
          wordpress: {version: 'latest', php_version: '8.3'},
          development: {dynamic_urls: true},
        };
        writeProjectConfig(projectConfig);

        const localConfig: LocalConfig = {
          project_id: projectId,
          hostname,
          port,
          runtime: 'bitnami',
          created_at: new Date().toISOString(),
        };
        const runtimeDir = getProjectRuntimeDir(projectId);
        writeLocalConfig(localConfig, runtimeDir);
      },
    },
    {
      label: 'Setting up reverse proxy...',
      run: async () => {
        writeTraefikCompose();
      },
    },
    {
      label: 'Generating runtime files...',
      run: async () => {
        const runtimeDir = getProjectRuntimeDir(projectId);
        const dbPassword = randomUUID().replace(/-/g, '').slice(0, 24);
        writeProjectCompose(
          {
            projectSlug: theme.slug,
            themePath: theme.path,
            themeSlug: theme.slug,
            hostname,
            phpMyAdminHostname,
            dbPassword,
            dataDir: runtimeDir,
          },
          runtimeDir,
        );
      },
    },
  ];

  return (
    <Box flexDirection="column">
      <StepRunner
        steps={steps}
        onComplete={() => {
          setTimeout(() => exit(), 100);
        }}
        onError={() => {
          setTimeout(() => exit(new Error()), 100);
        }}
      />
    </Box>
  );
}
```

Note: The `onComplete` callback will render a success message — we add that in the next step by enhancing StepRunner to accept a `completionMessage` prop or we add it inline. For now, the success is shown via the checkmarks from StepRunner.

Wait — we should show a success summary. Let me add a `successMessage` prop to the component inline. Actually, let's keep StepRunner simple and add the success output directly in the Init command. Let me revise:

```tsx
import React, {useState} from 'react';
import {Box, Text, useApp} from 'ink';
import {randomUUID} from 'node:crypto';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {isDockerInstalled, isDockerRunning} from '../lib/docker.js';
import {detectTheme} from '../lib/theme.js';
import {projectConfigExists, writeProjectConfig, writeLocalConfig} from '../lib/config.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {findAvailablePort} from '../lib/ports.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {writeTraefikCompose} from '../lib/traefik.js';
import {writeProjectCompose} from '../lib/compose.js';
import type {ProjectConfig, LocalConfig, ThemeInfo} from '../types/config.js';

export const description = 'Initialize a new Kiqr project in the current directory';

export default function Init() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [projectHostname, setProjectHostname] = useState('');

  let theme: ThemeInfo;
  let projectId: string;
  let hostname: string;
  let phpMyAdminHostname: string;
  let port: number;

  const steps: Step[] = [
    {
      label: 'Checking Docker...',
      run: async () => {
        if (!isDockerInstalled()) {
          throw new Error(
            'Docker is not installed. Please install Docker Desktop from https://docker.com',
          );
        }
        if (!isDockerRunning()) {
          throw new Error(
            'Docker is not running. Please start Docker Desktop and try again.',
          );
        }
      },
    },
    {
      label: 'Checking theme...',
      run: async () => {
        const detected = detectTheme();
        if (!detected) {
          throw new Error(
            'This folder does not appear to be a WordPress theme.\nMake sure you have a style.css file with a "Theme Name:" header.',
          );
        }
        theme = detected;
        setThemeName(theme.name);
      },
    },
    {
      label: 'Checking project...',
      run: async () => {
        if (projectConfigExists()) {
          throw new Error(
            'This project is already initialized. A kiqr.yaml file already exists.',
          );
        }
      },
    },
    {
      label: 'Creating project configuration...',
      run: async () => {
        projectId = randomUUID();
        hostname = buildProjectHostname(theme.slug);
        phpMyAdminHostname = buildProjectHostname(theme.slug, 'phpmyadmin');
        port = await findAvailablePort();

        setProjectHostname(hostname);

        const projectConfig: ProjectConfig = {
          project_id: projectId,
          name: theme.slug,
          wordpress: {version: 'latest', php_version: '8.3'},
          development: {dynamic_urls: true},
        };
        writeProjectConfig(projectConfig);

        const localConfig: LocalConfig = {
          project_id: projectId,
          hostname,
          port,
          runtime: 'bitnami',
          created_at: new Date().toISOString(),
        };
        const runtimeDir = getProjectRuntimeDir(projectId);
        writeLocalConfig(localConfig, runtimeDir);
      },
    },
    {
      label: 'Setting up reverse proxy...',
      run: async () => {
        writeTraefikCompose();
      },
    },
    {
      label: 'Generating runtime files...',
      run: async () => {
        const runtimeDir = getProjectRuntimeDir(projectId);
        const dbPassword = randomUUID().replace(/-/g, '').slice(0, 24);
        writeProjectCompose(
          {
            projectSlug: theme.slug,
            themePath: theme.path,
            themeSlug: theme.slug,
            hostname,
            phpMyAdminHostname,
            dbPassword,
            dataDir: runtimeDir,
          },
          runtimeDir,
        );
      },
    },
  ];

  return (
    <Box flexDirection="column">
      <StepRunner
        steps={steps}
        onComplete={() => {
          setComplete(true);
          setTimeout(() => exit(), 100);
        }}
        onError={() => {
          setTimeout(() => exit(new Error()), 100);
        }}
      />
      {complete && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">Your project is ready!</Text>
          <Text> </Text>
          <Text>Theme: <Text bold>{themeName}</Text></Text>
          <Text>Local address: <Text bold>http://{projectHostname}:7000</Text></Text>
          <Text> </Text>
          <Text dimColor>Run <Text bold>kiqr up</Text> to start your site.</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Build and verify typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/init.tsx
git commit -m "feat: add kiqr init command with Docker, theme, and config setup"
```

---

## Task 14: Up Command

**Files:**
- Create: `src/commands/up.tsx`

- [ ] **Step 1: Implement the up command**

```tsx
import React, {useState} from 'react';
import {Box, Text, useApp} from 'ink';
import StepRunner from '../components/StepRunner.js';
import type {Step} from '../components/StepRunner.js';
import {isDockerInstalled, isDockerRunning, runDockerCompose} from '../lib/docker.js';
import {readProjectConfig, readLocalConfig} from '../lib/config.js';
import {getProjectRuntimeDir} from '../lib/paths.js';
import {ensureTraefikRunning} from '../lib/traefik.js';
import {buildProjectHostname} from '../lib/hostname.js';
import path from 'node:path';
import type {ProjectConfig, LocalConfig} from '../types/config.js';

export const description = 'Start the WordPress development environment';

export default function Up() {
  const {exit} = useApp();
  const [complete, setComplete] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [pmaUrl, setPmaUrl] = useState('');

  let projectConfig: ProjectConfig;
  let localConfig: LocalConfig;

  const steps: Step[] = [
    {
      label: 'Checking Docker...',
      run: async () => {
        if (!isDockerInstalled()) {
          throw new Error(
            'Docker is not installed. Please install Docker Desktop from https://docker.com',
          );
        }
        if (!isDockerRunning()) {
          throw new Error(
            'Docker is not running. Please start Docker Desktop and try again.',
          );
        }
      },
    },
    {
      label: 'Loading project...',
      run: async () => {
        const pc = readProjectConfig();
        if (!pc) {
          throw new Error(
            'This project is not initialized.\nRun "kiqr init" first to set up your project.',
          );
        }
        projectConfig = pc;

        const runtimeDir = getProjectRuntimeDir(projectConfig.project_id);
        const lc = readLocalConfig(runtimeDir);
        if (!lc) {
          throw new Error(
            'Local configuration not found.\nRun "kiqr init" to set up this project on this machine.',
          );
        }
        localConfig = lc;

        setSiteUrl(`http://${localConfig.hostname}:7000`);
        setPmaUrl(`http://${buildProjectHostname(projectConfig.name, 'phpmyadmin')}:7000`);
      },
    },
    {
      label: 'Starting reverse proxy...',
      run: async () => {
        ensureTraefikRunning();
      },
    },
    {
      label: 'Starting WordPress and database...',
      run: async () => {
        const runtimeDir = getProjectRuntimeDir(projectConfig.project_id);
        const composePath = path.join(runtimeDir, 'compose.yaml');
        runDockerCompose(composePath, 'up', ['-d']);
      },
    },
  ];

  return (
    <Box flexDirection="column">
      <StepRunner
        steps={steps}
        onComplete={() => {
          setComplete(true);
          setTimeout(() => exit(), 100);
        }}
        onError={() => {
          setTimeout(() => exit(new Error()), 100);
        }}
      />
      {complete && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">Your site is ready!</Text>
          <Text> </Text>
          <Text>Site:</Text>
          <Text bold color="cyan">{siteUrl}</Text>
          <Text> </Text>
          <Text>phpMyAdmin:</Text>
          <Text bold color="cyan">{pmaUrl}</Text>
          <Text> </Text>
          <Text dimColor>WordPress may take a minute to fully start on first run.</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Build and verify typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/up.tsx
git commit -m "feat: add kiqr up command to start WordPress development environment"
```

---

## Task 15: Final Integration and Smoke Test

**Files:**
- Modify: `src/commands/index.tsx` (update default command message)

- [ ] **Step 1: Update default command**

The index command (no subcommand) should show a helpful message:

```tsx
import React from 'react';
import {Box, Text} from 'ink';

export const description = 'WordPress theme development CLI';

export default function Index() {
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Kiqr CLI</Text>
      <Text dimColor>Local WordPress theme development</Text>
      <Text> </Text>
      <Text>Commands:</Text>
      <Text>  <Text bold>kiqr init</Text>   Initialize a new project</Text>
      <Text>  <Text bold>kiqr up</Text>     Start the development environment</Text>
      <Text> </Text>
      <Text dimColor>Run <Text bold>kiqr --help</Text> for more information.</Text>
    </Box>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: clean build, `dist/cli.js` created

- [ ] **Step 4: Verify CLI runs**

```bash
node dist/cli.js
node dist/cli.js --help
```

Expected: shows help output with init and up commands listed

- [ ] **Step 5: Commit**

```bash
git add src/commands/index.tsx
git commit -m "feat: update default command with usage information"
```

---

## Task 16: Run all checks and final commit

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: clean build

- [ ] **Step 4: Verify binary works**

```bash
node dist/cli.js
node dist/cli.js init --help
node dist/cli.js up --help
```

Expected: all produce clean output

- [ ] **Step 5: Final commit if any loose changes**

```bash
git status
# If anything uncommitted:
git add -A
git commit -m "chore: final cleanup for Kiqr CLI MVP"
```
