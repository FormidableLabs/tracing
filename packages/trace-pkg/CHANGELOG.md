Changes

## 0.5.3

### Patch Changes

- Adding NPM Provenance Badge ([#28](https://github.com/FormidableLabs/tracing/pull/28))

- Updated dependencies [[`7b169ce`](https://github.com/FormidableLabs/tracing/commit/7b169ceeee461ecd952ef19ac31f92291b43a989)]:
  - trace-deps@0.5.2

## 0.5.2

### Patch Changes

- Add `ignoreExtensions` option to `traceFile`/`traceFiles` in `trace-deps` and `trace-pkg` options (see [#18](https://github.com/FormidableLabs/tracing/issues/18)). ([#23](https://github.com/FormidableLabs/tracing/pull/23))

- Updated dependencies [[`aa98a36`](https://github.com/FormidableLabs/tracing/commit/aa98a36d728bd5516ed4fb32f52bc3eaa1f89961)]:
  - trace-deps@0.5.1

## 0.5.1

### Patch Changes

- Replace chalk with picocolors (see [#9](https://github.com/FormidableLabs/tracing/issues/9)). ([#21](https://github.com/FormidableLabs/tracing/pull/21))

## 0.5.0

### Major Changes

- BREAKING: Remove `production` and `development` from set of default user conditions in package resolution.

### Minor Changes

- Feature (`trace-pkg`): Add `conditions` option. ([#12](https://github.com/FormidableLabs/tracing/pull/12))

### Patch Changes

- Updated dependencies [[`43552d1`](https://github.com/FormidableLabs/tracing/commit/43552d1ccee1d1d9709b90d5af128a476c7b46f4)]:
  - # trace-deps@0.5.0

## 0.4.1

- Feature: Async JavaScript configuration function.
  [#43](https://github.com/FormidableLabs/trace-pkg/issues/43)
- Dependencies: Various updates.
- Test: Upgrade `mock-fs` and re-enable Node16+
  [#39](https://github.com/FormidableLabs/trace-pkg/issues/39)

## 0.4.0

- Feature: Add full support for modern Node.js ESM and `exports`.
- Chore: Upgrade various dependencies.

## 0.3.4

- Feature: Support application source paths as keys in `allowMissing`.

## 0.3.3

- Feature: Add `--silent` CLI flag.
  [#12](https://github.com/FormidableLabs/trace-pkg/issues/12)
  (_[Burnett2k][]_)

## 0.3.2

- Bug: Make `concurrency: 1` / "serial" mode actually run serially.

## 0.3.1

- Feature: Add `includeSourceMaps` configuration option.

## 0.3.0

- Feature: Add `collapsed.bail` configuration option.
  [#3](https://github.com/FormidableLabs/trace-pkg/issues/3)
  [#4](https://github.com/FormidableLabs/trace-pkg/issues/4)

## 0.2.1

- Feature: Add `dynamic.bail` configuration option.
  [#4](https://github.com/FormidableLabs/trace-pkg/issues/4)

## 0.2.0

- Feature: Add `misses` report to `--report` and log output.
- Feature: Add `dynamic.resolutions` configuration option.
  [#4](https://github.com/FormidableLabs/trace-pkg/issues/4)

## 0.1.1

- Feature: Add `ignores`, `allowMissing` configuration options.
  [#4](https://github.com/FormidableLabs/trace-pkg/issues/4)

## 0.1.0

- Feature: Produce verbose `--report` about bundle run.
  [#2](https://github.com/FormidableLabs/trace-pkg/issues/2)
- Feature: `--dry-run`
  [#9](https://github.com/FormidableLabs/trace-pkg/issues/9)
- Feature: Parallel builds with `--concurrency`.
  [#4](https://github.com/FormidableLabs/trace-pkg/issues/4)

## 0.0.1

- Initial release.

[burnett2k]: https://github.com/Burnett2k
