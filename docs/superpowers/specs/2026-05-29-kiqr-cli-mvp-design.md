# Kiqr CLI MVP Design

## What It Is

Kiqr CLI (`@kiqr/cli`) is a Node.js + TypeScript command-line tool for local WordPress theme development. The developer works inside a WordPress theme repository; Kiqr provides the WordPress runtime automatically via Docker. Users manage a WordPress site, not infrastructure.

## MVP Scope

- WordPress theme development only
- Two commands: `kiqr init` and `kiqr up`
- Current directory must be a valid WordPress theme (has `style.css` with `Theme Name:`)

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (strict) |
| CLI framework | Pastel (Ink-based) |
| UI rendering | Ink (React for CLI) |
| Runtime | Docker + Docker Compose |
| Reverse proxy | Traefik (global, shared, port 7000) |
| Database | MariaDB |
| WordPress | Bitnami WordPress (abstracted behind RuntimeProvider) |
| DB admin | phpMyAdmin |
| Config format | YAML |

## Architecture

### Command Routing

Pastel handles command routing, help screens, and argument parsing. Two commands for MVP:

- `kiqr init` — scaffold project config, detect theme, generate UUID, reserve port, set up Traefik
- `kiqr up` — start WordPress + MariaDB + phpMyAdmin, display URLs

### Project Identity

Each project gets a permanent UUID at `kiqr init` time. This UUID is the primary key for everything — local config, runtime directories, future cloud features. Project names and folder names may change; UUID never does.

### Configuration Split

**Shared config** (`kiqr.yaml` in project root, committed to git):

```yaml
project_id: "a1b2c3d4-..."
name: "my-theme"

wordpress:
  version: "latest"
  php_version: "8.3"

development:
  dynamic_urls: true
```

No machine-specific values (no ports, hostnames, secrets).

**Local machine config** (platform-specific user config directory):

- macOS: `~/Library/Application Support/Kiqr/projects/<uuid>/config.yaml`
- Linux: `~/.config/kiqr/projects/<uuid>/config.yaml`
- Windows: `%APPDATA%/Kiqr/projects/<uuid>/config.yaml`

```yaml
project_id: "a1b2c3d4-..."
hostname: "my-theme.rasmus-macbook.local"
port: 3812
runtime: "bitnami"
created_at: "2026-05-29T12:00:00Z"
```

### Global Kiqr Directory

Runtime files (compose, env, logs, database) live in the user config directory under `projects/<uuid>/`:

```
Kiqr/
  projects/
    <uuid>/
      compose.yaml
      runtime.env
      logs/
      database/
```

The project repository stays clean.

### Hostname Strategy

Hostnames are machine-specific, never stored in shared config.

Format: `<project-name>.<computer-hostname>.local`

Computer hostname is auto-detected from the OS. Examples:

- `my-theme.rasmus-macbook.local`
- `my-theme.anna-laptop.local`

### Traefik (Global Reverse Proxy)

- Single shared Traefik instance across all Kiqr projects
- Listens on port 7000
- Auto-starts if not running
- Routes by hostname to per-project WordPress/phpMyAdmin containers
- Managed via a dedicated Docker Compose file in the global Kiqr directory

URLs shown to users:

- `http://my-theme.rasmus-macbook.local:7000` (WordPress)
- `http://phpmyadmin.my-theme.rasmus-macbook.local:7000` (phpMyAdmin)

### Runtime Provider Abstraction

```
RuntimeProvider (interface)
  generateComposeServices(config): ComposeServiceDefinition
  getThemeMountPath(themeName): string
  getEnvironmentVariables(config): Record<string, string>
  ...

BitnamiRuntimeProvider implements RuntimeProvider
```

Bitnami WordPress is the initial provider. The abstraction allows swapping to a future `kiqr/wordpress` image without CLI changes.

### Theme Detection

A valid theme requires `style.css` in the current directory containing a `Theme Name:` header. If invalid, show a friendly error and stop.

### Dynamic WordPress URLs

In development mode, Kiqr patches `wp-config.php` so WordPress dynamically resolves its URL from the incoming request's `HTTP_HOST`. This is gated behind `KIQR_DEVELOPMENT=true`.

### Docker Compose Generation

Per-project compose file is generated into the global directory. Services:

1. **WordPress** (Bitnami) — mounts theme directory into `wp-content/themes/<theme-name>`
2. **MariaDB** — persistent volume in global directory
3. **phpMyAdmin** — connected to MariaDB

All services connect to a shared Traefik network. Traefik labels handle routing.

### Port Management

Each project gets a unique internal port, reserved at init time. Traefik handles the single external port (7000). Internal ports are tracked in local machine config to avoid collisions.

## UX

All output uses Ink components:

- Spinners for async operations
- Success/error screens with friendly messages
- WordPress-centric language (Site, Database, Files — never Container, Volume, Network)

## Project Structure

```
src/
  cli.tsx                          # Pastel app entry point

  commands/
    init.tsx                       # kiqr init command
    up.tsx                         # kiqr up command

  components/
    Spinner.tsx                    # Reusable spinner
    Success.tsx                    # Success message display
    ErrorMessage.tsx               # Friendly error display

  lib/
    docker.ts                      # Docker installed/running checks
    config.ts                      # Read/write kiqr.yaml and local config
    paths.ts                       # Platform-specific path resolution
    theme.ts                       # Theme detection and validation
    runtime.ts                     # Runtime provider orchestration
    traefik.ts                     # Global Traefik management
    compose.ts                     # Docker Compose file generation
    ports.ts                       # Port reservation and conflict detection
    hostname.ts                    # OS hostname detection, local hostname generation

  providers/
    RuntimeProvider.ts             # Interface definition
    BitnamiRuntimeProvider.ts      # Bitnami implementation

  types/
    config.ts                      # TypeScript types for all config shapes
```

## Package Setup

- Package name: `@kiqr/cli`
- Binary name: `kiqr`
- Works via `npm install -g @kiqr/cli` and `npx kiqr`
- TypeScript strict mode, ESM
- Build with tsup

## Error Handling

Every check (Docker installed, Docker running, theme valid, project initialized) produces a friendly error and exits cleanly. No stack traces shown to users.

## What's NOT in MVP

- Plugin development support
- Full WordPress repository support
- `kiqr down`, `kiqr destroy`, `kiqr logs`, or any other commands
- Cloud sync, preview URLs, deployments
- HTTPS/TLS
- Multi-site WordPress
- Custom Docker image builds
