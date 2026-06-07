# Kiqr CLI

**Local WordPress theme development that doesn't make you want to quit web development.**

You have a theme. You want to work on it. You do *not* want to hand-roll a `docker-compose.yml`, fight Nginx, remember which port MAMP decided to squat on this week, or edit `/etc/hosts` like it's 2009.

Kiqr is the deal: you stay in your theme repo, run one command, and a real WordPress site — database, admin, phpMyAdmin, hot-reloading and all — appears at a tidy local URL. WordPress core stays out of your git history. Your theme stays the star of the show.

```bash
cd my-glorious-theme
kiqr up
# ☕ ...a few seconds later...
# → http://my-glorious-theme.your-laptop.lvh.me:5477
```

That's the whole pitch. Keep reading and we'll prove it.

---

## Prerequisites

- [Node.js](https://nodejs.org) **18+** — you almost certainly have this already.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — the engine room. Kiqr drives it so you don't have to.

Not sure your machine is ready? Kiqr will tell you straight:

```bash
kiqr doctor
```

## Install

**Per project (recommended)** — pin it to the theme, keep the whole team on the same version:

```bash
npm install --save-dev @kiqr/cli
npx kiqr up
```

Add a couple of scripts and your teammates never even have to learn the commands:

```json
{
  "scripts": {
    "dev": "kiqr up",
    "stop": "kiqr down"
  }
}
```

**Globally** — if you live in the terminal and want `kiqr` everywhere:

```bash
npm install -g @kiqr/cli
```

## The one rule

Your project directory must be a WordPress theme — i.e. it has a `style.css` with a `Theme Name:` header. That's how Kiqr knows what it's looking at:

```css
/*
Theme Name: My Glorious Theme
*/
```

No header, no theme, no party. (Kiqr will say so politely.)

## Quick start (the 60-second version)

```bash
cd my-glorious-theme
kiqr up
```

First run in a fresh theme? Kiqr notices there's no project config yet, recognizes your theme, and offers to set everything up — no `init` ceremony required. When it's done you get:

- 🌐 your site at `http://<theme>.<your-computer>.lvh.me:5477`
- 🔐 a one-click auto-login to `/wp-admin`
- 🗄️ phpMyAdmin, also one click
- 💾 a database and uploads folder that survive restarts

Edit a file, hit refresh (or run `kiqr watch` and don't even do that). Welcome to the good life.

---

## Commands

Everything below is a real, shipped command. Run `kiqr <command> --help` any time you forget the details.

### 🚦 The daily drivers

| Command | What it does |
|---|---|
| `kiqr up` | Spin up the environment. Auto-initializes a new theme if needed. |
| `kiqr down` | Stop your project's containers. Your data stays put. |
| `kiqr restart` | Stop, regenerate config, start again — the classic "turn it off and on." |
| `kiqr watch` | Watch theme files and auto-reload the browser on every save. |

`kiqr watch` runs a LiveReload server and watches `.php`, `.css`, `.js`, `.scss`, `.sass`, `.less`, `.html`, and `.txt`. Change a stylesheet, the browser refreshes the CSS in place; change anything else, it does a full reload. Two terminals, infinite smugness.

### 🔎 Looking around

| Command | What it does |
|---|---|
| `kiqr status` | Is it running, and where do I reach it? At a glance. |
| `kiqr info` | Project details + credentials (admin login, DB creds). |
| `kiqr logs` | Tail the WordPress container logs. |
| `kiqr doctor` | Environment health check — Docker installed? running? ports free? |

`kiqr doctor` is the first thing to run when something feels off. It checks that Docker is installed and awake, that the ports Kiqr needs are free, and flags WSL — so you stop guessing and start fixing.

### 🌐 Opening things

`kiqr open` launches URLs and folders so you don't have to copy-paste them:

| Command | Opens |
|---|---|
| `kiqr open` | Your site |
| `kiqr open admin` | `/wp-admin`, auto-logged-in (no password tango) |
| `kiqr open phpmyadmin` | phpMyAdmin, auto-logged-in |
| `kiqr open plugins` | The local plugins folder |
| `kiqr open uploads` | The local uploads folder |
| `kiqr open data` | The project's local data directory |

### 🗄️ Database backups (`kiqr db`)

Snapshots of your local database, compressed and tagged so you can roll back after that "experimental" migration.

| Command | What it does |
|---|---|
| `kiqr db dump` | Create a compressed `.sql.gz` backup. |
| `kiqr db list` | List your backups, newest first. |
| `kiqr db restore <id>` | Restore from a backup (with a safety net — see below). |

`kiqr db restore` offers to take a fresh safety backup before it overwrites anything, and makes you solve a tiny math problem first so you can't fat-finger your way to regret.

### 🔧 WP-CLI passthrough (`kiqr wp`)

The entire [WP-CLI](https://wp-cli.org) toolbox, piped straight into your container:

```bash
kiqr wp plugin install woocommerce --activate
kiqr wp user create alice alice@example.com --role=editor
kiqr wp post create --post_title="Hello World" --post_status=publish
kiqr wp search-replace 'old.test' 'new.test' --dry-run
```

Arguments are passed through verbatim — quotes, spaces and all — so even fiddly commands behave.

### 🌱 Demo content (`kiqr seed`)

Staring at an empty install is no way to build a theme. Generate realistic content and import it:

```bash
kiqr seed --preset blog        # posts + an About page (default)
kiqr seed --preset portfolio   # an intro page + project pages
kiqr seed --preset woocommerce # a shelf of demo products
kiqr wp import kiqr-seed-blog.xml --authors=create
```

`kiqr seed` writes a standard WordPress import file (WXR) full of block-editor-friendly content — then `kiqr wp import` pours it in.

### 🤖 The kiqr agent (`kiqr agent`)

The shared reverse proxy + splash page that route every Kiqr site live as one persistent background service — **the kiqr agent**. It starts on your first `kiqr up` and keeps humming across projects, so switching themes doesn't thrash the proxy up and down.

| Command | What it does |
|---|---|
| `kiqr agent status` | Is the agent running? On what port? |
| `kiqr agent start` | Start it. |
| `kiqr agent stop` | Stop it (e.g. to free the port). |
| `kiqr agent restart` | Restart it. |
| `kiqr agent logs` | Stream its logs. |

`kiqr down` and `kiqr destroy` leave the agent alone on purpose — it's infrastructure, not project clutter. (It's also where future shared goodies will live: a dashboard, a mail catcher, the collaboration tunnel.)

### 🧹 Setup & housekeeping

| Command | What it does |
|---|---|
| `kiqr init` | Initialize a Kiqr project in the current directory (usually automatic via `kiqr up`). |
| `kiqr destroy` | Nuke this project's data — database, uploads, the lot — and start fresh. Asks first. |
| `kiqr completion <bash\|zsh\|fish>` | Print a shell completion script. |

Tab-completion is a quality-of-life upgrade you didn't know you needed:

```bash
kiqr completion bash >> ~/.bashrc      # bash
kiqr completion zsh  > "${fpath[1]}/_kiqr"   # zsh
kiqr completion fish > ~/.config/fish/completions/kiqr.fish  # fish
```

---

## Recipes (real workflows)

**Onboard a new dev in one command.** They clone the theme repo and run `kiqr up`. Same WordPress version, same PHP, same everything — because it's all in `kiqr.yaml`. No "works on my machine."

**Switch PHP or WordPress version.** Edit `kiqr.yaml`, then `kiqr restart`. Kiqr validates the combo against Docker Hub *before* pulling, so you get a clear "WP 6.4 doesn't ship PHP 8.5 — try 8.3" instead of a cryptic failure. Database and uploads are preserved.

**Try something reckless, then undo it.** `kiqr db dump` → break things gloriously → `kiqr db restore <id>`. Time travel for your database.

**Populate a fresh theme for screenshots/QA.** `kiqr seed --preset woocommerce && kiqr wp import kiqr-seed-woocommerce.xml --authors=create`.

**Start completely over.** `kiqr destroy` wipes the data; the next `kiqr up` builds a pristine site.

---

## Configuration

Project settings live in `kiqr.yaml`, committed to git so the whole team shares them:

```yaml
project_id: "a1b2c3d4-..."   # stable id; never changes even if you rename the folder
name: "my-glorious-theme"

wordpress:
  version: 7                 # any valid WordPress Docker tag (e.g. 7, 6.4, or "latest")
  php_version: 8.3           # the PHP version to run WordPress on

development:
  dynamic_urls: true
```

Point `wordpress.version` at any [WordPress Docker tag](https://hub.docker.com/_/wordpress/tags), run `kiqr restart`, and you've switched versions without losing data. Machine-specific secrets (database password, login token) are stored *outside* the repo in your local data directory — they never get committed.

## How it works

Kiqr orchestrates WordPress, MariaDB, and phpMyAdmin in Docker containers, with [Traefik](https://traefik.io) out front as a reverse proxy and a friendly splash page for unmatched hostnames. Your theme directory is bind-mounted straight into WordPress, so every save shows up instantly.

- **Your repository** holds only theme code.
- **WordPress core** is managed by Docker and never committed.
- **Database & uploads** live in your OS's application-data directory, keyed by `project_id`.
- **Plugins** live in a local folder (`kiqr open plugins`).

Each developer gets a hostname derived from their computer name (`<theme>.<computer>.lvh.me`), which always resolves to `127.0.0.1` — so there are zero port collisions even when the whole team is on the same Wi-Fi, and nobody touches `/etc/hosts`.

The shared proxy + splash are bundled as **the kiqr agent** (see above): one persistent service the whole machine shares.

## Troubleshooting

Start here, always:

```bash
kiqr doctor
```

- **"Docker is not running"** → start Docker Desktop, then retry.
- **Port already in use** → `kiqr agent stop` (or free whatever's on the port) and try again.
- **A command crashed on a weird config** → Kiqr validates `kiqr.yaml` and tells you exactly which field is wrong.

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev loop, coding standards, and the branch → PR → CI flow. The short version: `npm install`, `npm run dev`, and make sure `npm run lint && npm run typecheck && npm test && npm run build` are all green before you push.

## License

MIT — go build something great.
