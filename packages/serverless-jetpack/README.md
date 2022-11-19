Serverless Jetpack 🚀
====================

[![npm version][npm_img]][npm_site]
[![Maintenance Status][maintenance-image]](#maintenance-status)

A faster JavaScript packager for [Serverless][] applications.

- ⚡ Drop-in replacement for `serverless package|deploy`
- 💻 Lambda Functions packaging
- 🍰 Lambda Layers packaging
- 📦 Per-function packaging
- 🐉 Monorepo (`lerna`, `yarn workspace`) support
- 🔀 Tunable, multi-cpu parallelization
- 🔎 Dependency tracing options (faster packaging, slimmer bundles)

## Usage

### The short, short version

First, install the plugin:

```sh
$ yarn add --dev serverless-jetpack
$ npm install --save-dev serverless-jetpack
```

Add to `serverless.yml`

```yml
plugins:
  - serverless-jetpack
```

... and you're off to faster packaging awesomeness! 🚀

### Configuration

Most Serverless framework projects should be able to use Jetpack without any extra configuration besides the `plugins` entry. However, there are some additional options that may be useful in some projects (e.g., [lerna][] monorepos, [yarn workspaces][])...

The following **global** configurations are available via `custom.jetpack` to apply by default to all service, function, and layer packages:

* `concurrency` (`Number`): The number of independent package tasks to run off the main execution thread. If `1`, then run tasks serially in main thread. If `2+` run off main thread with `concurrency` number of workers. If `0`, then use "number of CPUs" value. (default: `1`).
    * This option is most useful for Serverless projects that (1) have many individually packaged functions, and (2) large numbers of files and dependencies. E.g., start considering this option if your per-function packaging time takes more than 10 seconds and you have more than one service and/or function package.

The following **function** and **layer**-level configurations are available via `functions.{FN_NAME}.jetpack` and  `layers.{LAYER_NAME}.jetpack`:

<!-- TODO(JETPACK): Function, Layer configurations -->

## Maintenance status

**Active:** Formidable is actively working on this project, and we expect to continue for work for the foreseeable future. Bug reports, feature requests and pull requests are welcome.

[Serverless]: https://serverless.com/
[lerna]: https://lerna.js.org/
[yarn workspaces]: https://yarnpkg.com/lang/en/docs/workspaces/
[inspectdep]: https://github.com/FormidableLabs/tracing/tree/main/packages/inspectdep#readme
[trace-deps]: https://github.com/FormidableLabs/tracing/tree/main/packages/trace-deps#readme
[globby]: https://github.com/sindresorhus/globby
[nanomatch]: https://github.com/micromatch/nanomatch

[npm_img]: https://badge.fury.io/js/serverless-jetpack.svg
[npm_site]: http://badge.fury.io/js/serverless-jetpack
[maintenance-image]: https://img.shields.io/badge/maintenance-active-brightgreen.svg
