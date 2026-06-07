# Kiqr CLI

Local WordPress theme development powered by Docker. Work inside your theme repository — Kiqr handles WordPress, the database, and everything else automatically.

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Install

**Globally:**

```bash
npm install -g @kiqr/cli
```

**Per project (recommended):**

```bash
npm install --save-dev @kiqr/cli
```

Then use it via `npx`:

```bash
npx kiqr up
```

Or add scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "kiqr up",
    "stop": "kiqr down"
  }
}
```

## Quick start

```bash
cd your-theme-directory
kiqr up
```

That's it. If the project isn't initialized yet, Kiqr will detect your theme and offer to set it up. Your WordPress site will be available at a local URL like:

```
http://your-theme.your-computer.lvh.me:5477
```

## Requirements

Your project directory must be a WordPress theme — a folder containing a `style.css` with a `Theme Name:` header:

```css
/*
Theme Name: My Theme
*/
```

## Commands

| Command | Description |
|---------|-------------|
| `kiqr scaffold theme <name>` | Scaffold a new WordPress theme (block by default) |
| `kiqr scaffold theme <name> --type classic` | Scaffold a classic (PHP template) theme |
| `kiqr up` | Start the development environment |
| `kiqr down` | Stop the development environment |
| `kiqr restart` | Restart the development environment |
| `kiqr init` | Initialize a new project |
| `kiqr doctor` | Check your environment for common problems |
| `kiqr info` | Show project info and credentials |
| `kiqr open` | Open the site in your browser |
| `kiqr open admin` | Open the WordPress dashboard (auto-login) |
| `kiqr open phpmyadmin` | Open phpMyAdmin (auto-login) |
| `kiqr open plugins` | Open the plugins folder |
| `kiqr open uploads` | Open the uploads folder |
| `kiqr logs` | Show WordPress logs |
| `kiqr destroy` | Remove all site data and start fresh |

## Configuration

Project settings are stored in `kiqr.yaml` (committed to git):

```yaml
project_id: "a1b2c3d4-..."
name: "my-theme"

wordpress:
  version: "latest"
  php_version: "8.3"

development:
  dynamic_urls: true
```

Change `wordpress.version` to any valid [WordPress Docker tag](https://hub.docker.com/_/wordpress/tags) and run `kiqr restart` to switch versions. The database and uploads are preserved.

## How it works

Kiqr runs WordPress, MariaDB, and phpMyAdmin in Docker containers, with [Traefik](https://traefik.io) as a reverse proxy. Your theme directory is mounted directly into WordPress — every file change is reflected immediately.

- **Your repository** contains only theme code
- **WordPress core** is managed by Docker (never committed)
- **Database and uploads** are stored locally in your system's application data directory
- **Plugins** are stored in a local directory (open with `kiqr open plugins`)

Each developer on the team gets their own local hostname based on their computer name, so there are no port conflicts when working on the same network.

## License

MIT
