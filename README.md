KIQR CLI
-----------------
[![release-please](https://github.com/kiqr/cli/actions/workflows/release-please.yaml/badge.svg)](https://github.com/kiqr/cli/actions/workflows/release-please.yaml)

This is the command line application for [KIQR Headless CMS](https://kiqr.dev).

Installation
------------

Install the cli application globally by running:

```console
npm install -g @kiqr/cli
```

and run `kiqr --version` from your terminal to confirm that it has been successfully installed.

Getting started
---------------

### Authentication

Most of the kiqr commands requires you to be signed in to your [kiqr.cloud](https://kiqr.cloud) user account. You can authenticate by signing in with your user credentials directly in the console:

```console
$ kiqr login
```

### Display your user profile

You can get the current signed in user by running `kiqr me`:

```console
$ kiqr me
```

### Setup a project locally

Start by creating a project at [kiqr.cloud](https://kiqr.cloud) and make sure you have the `PROJECT_ID` in hand. You can then initialize the project locally by running `kiqr setup`. We recommend installing KIQR at the root of your frontend repository.

```console
$ kiqr setup <project_id>
```
Replace `<project_id>` in the example above with your projects `project_id`.

## License
The application is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Contributing
New contributors are very welcome and needed. KIQR Headless CMS is an open-source, community project that anyone can contribute to. Reviewing and testing is highly valued and the most effective way you can contribute as a new contributor. It also will teach you much more about the code and process than opening pull requests.

Except for testing, there are several ways you can contribute to the betterment of the project:
- **Report an issue?** - If the issue isn’t reported, we can’t fix it. Please report any bugs, feature, and/or improvement requests on the [GitHub Issues tracker](https://github.com/kiqr/cli/issues).
- **Submit patches** - Do you have a new feature or a fix you'd like to share? [Submit a pull request](https://github.com/kiqr/cli/pulls)!
- **Write blog articles** - Are you using KIQR? We'd love to hear how you're using it in your projects. Write a tutorial and post it on your blog!

### Development process
The `main` branch is regularly built and tested, but it is not guaranteed to be completely stable. Tags are created regularly from release branches to indicate new official, stable release versions of the KIQR cli.

### Commit message guidline
A good commit message should describe what changed and why. The KIQR-project uses [semantic commit messages](https://www.conventionalcommits.org/en/v1.0.0/) to streamline the release process.

Before a pull request can be merged, it must have a pull request title with a semantic prefix.

### Versioning
This application aims to adhere to [Semantic Versioning](http://semver.org/). Violations
of this scheme should be reported as bugs. Specifically, if a minor or patch
version is released that breaks backward compatibility, that version should be
immediately yanked and/or a new version should be immediately released that
restores compatibility. Breaking changes to the public API will only be
introduced with new major versions.
