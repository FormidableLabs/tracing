trace-deps 🔬
============

[![npm version][npm_img]][npm_site]
[![Maintenance Status][maintenance-image]](#maintenance-status)

A dependency tracing tool for Node.js source files.

## Overview

`trace-deps` can parse CommonJS / ESM source files, inspect dependency statements, and produce a list of absolute file paths on-disk for all inferred dependencies. The library currently works with files ending in `.js`, `.mjs` file extensions that contain the following dependency statements:

- `require("<string>")`: CommonJS require.
- `require.resolve("<string>")`: CommonJS require resolution (returns path to dependency instead of loaded code).
- `import "<string>"`, `import <var> | { <var> } | * as <var> from "<string>"`: ECMAScript Module static import.
- `export <var> | { <var> } | * as <var> from "<string>"`: ECMAScript Module static re-export.
- `import("<string>")`: ECMAScript Module dynamic import.

## API

### `traceFile({ srcPath, ignores })`

Trace and return on-disk locations of all file dependencies from a source file.

_Parameters_:

* `srcPath` (`string`): source file path to trace
* `ignoreExtensions` (`Array<string>`): A set of file extensions (e.g., `.map` or `.graphql`) to skip tracing on. These files will still be included in the bundle. These are added to our built-in extensions to skip of `.json` and `.node`.
* `ignores` (`Array<string>`): list of package prefixes to ignore tracing entirely
* `conditions` (`Array<string>`): list of Node.js runtime import [user conditions](https://nodejs.org/api/packages.html#resolving-user-conditions) to trace in addition to our default built-in Node.js conditions of `import`, `require`, `node`, and `default`.
* `allowMissing` (`Object.<string, Array<string>`): Mapping of (1) absolute source file paths and (2) package name or relative file path keys to permitted missing module prefixes values.
    * Source file keys must match the entire file path (e.g., `/FULL/PATH/TO/entry.js`) while package keys are the start of package name either alone or with the rest of the relative path to ultimate file (e.g., `lodash`, `@scope/pkg` or `@scope/pkg/some/path/to/file.js`).
    * Missing module prefix values may be the package name or any part of the relative path thereafter (e.g., `pkg`, `pkg/some`, `pkg/some/path/to/file.js`)
        * Paths in forward slash (`/`) form.
* `bailOnMissing` (`boolean`): Throw error if missing static import. (Default: `true`). If false, misses are added to `misses` object.
* `includeSourceMaps` (`boolean`): Include source map resolved file paths from control comments. File paths are not actually checked to see if present.  (Default: `false`)
    * Source mapping URLs are only included and resolved if they are of the form `//# sourceMappingURL=<url>` or `//@ sourceMappingURL=<url>` and have a relative / absolute on-disk path (that is resolved relative to source file containing the comment). URL values starting with `http://` or `https://` are ignored.
* `extraImports` (`Object.<string, Array<string>`): Mapping of files to additional imports to trace.
    * The **key** is path (either Posix or native OS paths are accepted) in the form of either:
        1. an **absolute** path to a source file (e.g., `/PATH/TO/src/foo.js`), or;
        2. a **relative** path to a file from a package in `node_modules` starting at the package name (e.g. `lodash/index.js`).
    * The **value** is an array of additional import specifiers that are resolved and further traced. The additional imports are anything that could be validly passed to a `require()` or `import` call (e.g., `./relative/path/to/source-file.js`, `a-pkg`, `a-pkg/with/nested/path.js`).
        * Paths should be specified as you would in a Node.js `require()` which is to say Posix `/` form.

_Returns_:

* (`Promise<Object>`): Dependencies and other information.
    * `dependencies` (`Array<string>`): list of absolute paths to on-disk dependencies
    * `sourceMaps` (`Array<string>`): list of resolved, absolute paths to source map files if `includeSourceMaps: true` parameter is specified
    * `misses` (`Object.<string, Array<Object>`): Mapping of file absolute paths on disk to an array of imports that `trace-deps` was **not** able to resolve (dynamic requires, etc.). The object contained in the value array is structured as follows:
        * `src` (`string`): The source code snippet of the import in question (e.g., `"require(A_VAR)"`)
        * `start`, `end` (`number`): The starting / ending character indexes in the source code string corresponding to the source file.
        * `loc` (`Object`): Line / column information for the code string at issue taking the form:
            ```js
            {
              start: { line: Number, column: Number},
              end:   { line: Number, column: Number}
            }
            ```
        * `type` (`string`): One of the following:
            * `dynamic`: A dynamic import that `trace-deps` cannot resolve.
            * `static`: A resolved dependency that was not found.
            * `extra`: A user-provided `extraImports` static value that was not found.
        * `dep` (`string`) (_optional_): The dependency value if statically inferred.

### `traceFiles({ srcPaths, ignores })`

Trace and return on-disk locations of all file dependencies from source files.

_Parameters_:

* `srcPaths` (`Array<string>`): source file paths to trace
* `ignoreExtensions` (`Array<string>`): set of file extensions to skip tracing on
* `ignores` (`Array<string>`): list of package prefixes to ignore
* `conditions` (`Array<string>`): list of Node.js runtime import user conditions to trace.
* `allowMissing` (`Object.<string, Array<string>`): Mapping of source file paths and package names/paths to permitted missing module prefixes.
* `bailOnMissing` (`boolean`): Throw error if missing static import.
* `includeSourceMaps` (`boolean`): Include source map file paths from control comments
* `extraImports` (`Object.<string, Array<string>`): Mapping of files to additional imports to trace.

_Returns_:

* (`Promise<Object>`): Dependencies and other information. See `traceFile()` for object shape.

## CLI

`trace-deps` also provides a handy CLI for checking all dependencies and misses imported.

```sh
$ trace-deps -h
Usage: trace-deps <action> [options]

Actions: (<action>)
  trace                     Trace dependencies and misses for a file

Options:
  --input, -i       (trace) Starting file to trace        [string]
  --output, -o      (trace) Output format (text, json)    [string] [default: text]
  --source-maps, -s (trace) Include source maps output    [boolean]
  --help, -h                Show help                     [boolean]
  --version, -v             Show version number           [boolean]

Examples:
  trace-deps trace --input ./path/to/file.js     Trace a source file
```

## Notes

* **Common configuration tips**: We maintain a [common configuration](./docs/configuration.md) document that discusses and outlines configurations that are likely to be applicable with popular open source libraries when setting up `trace-pkg` or `serverless-jetpack`

* **Only parses Node.js JavaScript**: `trace-deps` presently will only Node.js-compatible JavaScript in CommonJS or ESM formats. It will not correctly parse things like TypeScript, JSX, ReasonML, non-JavaScript, etc.

* **Only handles single string dependencies**: `require`, `require.resolve`, and dynamic `import()` support calls with variables or other expressions like `require(aVar)`, `import(process.env.VAL + "more-stuff")`. This library presently only supports calls with a **single string** and nothing else. We have a [tracking ticket](https://github.com/FormidableLabs/trace-deps/issues/2) to consider expanding support for things like partial evaluation.

* **Modern Node.js ESM / `package.json:exports` Support**: Node.js v12 and newer now support modern ESM, and `trace-deps` will correctly package your application in any Node.js runtime. Unfortunately, the implementation of how to [resolve an ESM import](https://nodejs.org/api/packages.html) in modern Node.js is quite complex.
    * **It's complicated**: For example, for the same import of `my-pkg`, a `require("my-pkg")` call in Node.js v10 might match a file specified in `package.json:main`, while `require("my-pkg")` in Node.js v12 might match a second file specified in `package.json:exports:".":require`, and `import "my-pkg"` in Node,js v12 might match a _third_ file specified in `package.json:exports:".":import`. Then, throw in [conditions](https://nodejs.org/api/packages.html#packages_conditional_exports), [subpaths](https://nodejs.org/api/packages.html#packages_subpath_exports), and even subpath conditions, and it becomes exceedingly difficult to statically analyze what is actually going to be imported at runtime by Node.js ahead of time, which is what `trace-deps` needs to do. 🤯
    * **Our solution**: Our approach is to basically give up on trying to figure out the exact runtime conditions that will be used in module resolution, and instead package all reasonable conditions for a given module import. This means that maintain correctness at the cost of slightly larger zip sizes for libraries that ship multiple versions of exports.
    * **Our implementation / conditions**: When `trace-deps` encounters a dependency, it resolves the file according to old CommonJS (reading `package.json:main`) and then in modern Node.js `package.json:exports` mode with each of the following built-in official conditions: `import`, `require`, `node`, `default`. We do not include any of the suggested user conditions (e.g., `production`, `development`, `browser`) by default. You can add additional user conditions using the `conditions` parameter.
    * **Missing Features**: `trace-deps` does not support the deprecated [subpath folder mappings](https://nodejs.org/api/packages.html#packages_subpath_folder_mappings) feature. Some advanced ESM features are still under development.

* **Includes `package.json` files used in resolution**: As this is a Node.js-focused library, to follow the Node.js [module resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together) which notably uses intermediate encountered `package.json` files to determine how to resolve modules. This means that we include a lot of `package.json` files that seemingly aren't directly imported (such as a `const pkg = require("mod/package.json")`) because they are needed for the list of all traced files to together resolve correctly if all on disk together.

* **Using the `allowMissing` option**: The `allowMissing` function field helps in situations where you want to allow certain dependencies to have known missing sub-dependencies, often seen in patterns like: `try { require("optional-dep"); } catch (e) {}`. If the sub-dependency is found, then it will be returned just like any normal one. If not, the module not found error is just swallowed and normal processing resumes.

    To configure the parameter, create an object of key `package-prefix` with a value of an array of other package prefixes to skip over not found errors:

    ```js
    traceFile({
      srcPath,
      allowMissing: {
        // While we don't normally expect your _own_ application sources to
        // have tracing misses, this often comes up in transpiled output that
        // you don't full control like Next.js `target: "serverless"` webpack
        // bundles for Lambda handlers.
        "/FULL/PATH/TO/dist/my-app.js":[
          "critters"
        ],
        // A normal package name from `node_modules`. The `ws` library for
        // example has various optional `require()`s.
        "ws": [
          // See, e.g.: https://github.com/websockets/ws/blob/08c6c8ba70404818f7f4bc23eb5fd0bf9c94c039/lib/buffer-util.js#L121-L122
          "bufferutil",
          // See, e.g.: https://github.com/websockets/ws/blob/b6430fea423d88926847a47d4ecfc36e52dc1164/lib/validation.js#L3-L10
          "utf-8-validate"
        ]
      }
    })
    ```

* **`ignores` vs. `allowMissing`**: The `ignores` option completely skips a dependency from being further traversed irrespective of whether or not a matching dependency exists on disk. The `allowMissing` option will include and further traverse dependencies that are present on disk if found and suppress any errors for matches that are missing.

[npm_img]: https://badge.fury.io/js/trace-deps.svg
[npm_site]: http://badge.fury.io/js/trace-deps

## Maintenance Status

**Active:** Formidable is actively working on this project, and we expect to continue for work for the foreseeable future. Bug reports, feature requests and pull requests are welcome.

[maintenance-image]: https://img.shields.io/badge/maintenance-active-green.svg?color=brightgreen&style=flat
