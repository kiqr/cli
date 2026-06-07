# Contributing to Kiqr CLI

Thanks for your interest in improving the Kiqr CLI! This guide covers everything
you need to get a local development environment running and to land a change.

The CLI is a TypeScript Node project built with [Pastel](https://github.com/vadimdemedes/pastel),
[Ink](https://github.com/vadimdemedes/ink), and [React](https://react.dev),
bundled with [tsup](https://tsup.egoist.dev) and tested with
[Vitest](https://vitest.dev).

## Prerequisites

- [Node.js](https://nodejs.org) 18 or newer (CI runs on Node 20, 22, and 24)
- npm (ships with Node)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — only
  required to run the CLI against a real WordPress environment, not for building
  or testing the code itself

## Setup

```bash
git clone https://github.com/kiqr/cli.git
cd cli
npm install
```

## Development loop

| Command | What it does |
|---------|--------------|
| `npm run dev` | Rebuild the bundle on every change (tsup watch mode) |
| `npm run build` | Produce the production bundle in `dist/` |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Type-check with `tsc --noEmit` (no emit) |

A typical inner loop is to run `npm run test:watch` (or `npm run dev`) in one
terminal while you edit.

### Trying the CLI locally

```bash
npm run build
node dist/cli.js --help
```

The `Makefile` mirrors the most common scripts (`make build`, `make test`,
`make typecheck`) if you prefer make targets.

## Coding standards

- 2-space indentation, single quotes, no spacing inside braces (`{x}`, not
  `{ x }`).
- Use **named exports**.
- Keep pure, side-effect-free logic in `src/lib/`. These functions should be
  easy to unit test in isolation.
- Put Ink/React components and command UIs in `src/commands/` (shared UI lives
  in `src/components/`).
- Prefer small, pure functions over stateful helpers wherever practical.

### Linting and formatting

Linting and formatting are handled by [Biome](https://biomejs.dev). Once it has
landed (it may currently be arriving via an open pull request), run:

```bash
npm run lint     # check for lint issues
npm run format   # apply formatting
```

If those scripts are not yet present in `package.json`, simply match the
existing code style described above; the formatter will normalize it once Biome
is wired up.

## Branch and PR workflow

1. Create a branch off `main` with a descriptive, kebab-case name. We use a
   `type/short-description` convention, for example:
   - `feat/doctor-command`
   - `fix/chokidar-file-watcher`
   - `docs/contributing-and-templates`
2. Make focused commits. End each commit message body with a
   `Co-Authored-By:` trailer when pairing or when a change is co-authored.
3. Keep pull requests small and single-purpose — it makes review faster and
   safer.
4. Open a pull request against `main` using the
   [pull request template](.github/PULL_REQUEST_TEMPLATE.md) and fill out the
   checklist.

## CI must pass

Every pull request runs the [CI workflow](.github/workflows/ci.yml) across a
matrix of **Node 20, 22, and 24**. Each job runs, in order:

```bash
npm run typecheck
npm test
npm run build
```

Please make sure all three pass locally before pushing:

```bash
npm run typecheck && npm test && npm run build
```

Pull requests cannot be merged until CI is green.

## Reporting bugs and requesting features

Use the issue templates:

- [Bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature request](.github/ISSUE_TEMPLATE/feature_request.md)

For bugs, please include your Kiqr version (`kiqr --version`), operating system,
Docker version (`docker --version`), and clear reproduction steps.

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT license](README.md#license).
