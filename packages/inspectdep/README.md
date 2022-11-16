inspectdep 🔎
============

[![npm version][npm_img]][npm_site]
[![Maintenance Status][maintenance-image]](#maintenance-status)

An inspection tool for dependencies in `node_modules`.

## API

### `findProdInstalls({ rootPath })`

Find on-disk locations of all production dependencies in `node_modules`.

_Notes_:

* This includes all `dependencies` and `optionalDependencies`, simulating what would happen during a `yarn|npm install --production`.
* Paths are relative to `rootPath` and separated with `path.sep` native OS separators
* If dependencies are not found installed on-disk they are simply ignored.
  [#2](https://github.com/FormidableLabs/inspectdep/issues/2)

_Parameters_:

* `rootPath` (`string`): `node_modules` root location (default: `process.cwd()`)
* `curPath` (`string`): location to start inferring dependencies from (default: `rootPath`)

_Returns_:

* (`Promise<Array<String>>`): list of relative paths to on-disk dependencies

[npm_img]: https://badge.fury.io/js/inspectdep.svg
[npm_site]: http://badge.fury.io/js/inspectdep
[maintenance-image]: https://img.shields.io/badge/maintenance-active-green.svg?color=brightgreen&style=flat

## Maintenance Status

**Active:** Formidable is actively working on this project, and we expect to continue for work for the foreseeable future. Bug reports, feature requests and pull requests are welcome.
