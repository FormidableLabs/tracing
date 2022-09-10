---
"trace-deps": minor
"trace-pkg": minor
---

- Feature (`trace-pkg`): Add `conditions` option.
- Feature (`trace-deps`): Add `conditions` parameter to `traceFile`/`traceFiles` to support user runtime loading conditions. (See [#trace-deps/56](https://github.com/FormidableLabs/trace-deps/issues/56))
- BREAKING: Remove `production` and `development` from set of default user conditions in package resolution.
