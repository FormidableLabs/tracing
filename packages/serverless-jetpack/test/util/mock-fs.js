"use strict";

const { readdir } = require("fs").promises;
const path = require("path");

const mock = require("mock-fs");

const LAZY_MODS = new Set(["ajv", "ajv-formats", "serverless", "aws-sdk"]);

// Find needed lazy node modules to load.
// If we do _all_ of these, it takes like a full second for all node_modules, so filter down.
// **NOTE**: Must be called **before** any calls to `mock()`.
let _lazyMods;
const getLazyPnpmMods = async () => {
  if (!_lazyMods) {
    const pnpmDir = path.resolve(__dirname, "../../../../node_modules/.pnpm");
    const mods = await readdir(pnpmDir);

    _lazyMods = mods.reduce((memo, mod) => {
      const pkg = mod.slice(0, mod.lastIndexOf("@"));
      if (LAZY_MODS.has(pkg)) {
        memo[mod] = mock.load(path.resolve(__dirname, `../../../../node_modules/.pnpm/${mod}`));
      }

      return memo;
    }, {});
  }

  return _lazyMods;
};

const mockSls = async (testDirFixtures) => {
  const pnpmMods = await getLazyPnpmMods();

  // Go to project root to load mocks.
  process.chdir(path.resolve(__dirname, "../../../../"));

  mock({
    packages: {
      "serverless-jetpack": {
        "test-dir": testDirFixtures
      }
    },
    node_modules: {
      ".pnpm": pnpmMods
    }
  });

  // Go back to package root for tests.
  process.chdir(path.resolve(__dirname, "../../test-dir"));
};

module.exports = {
  mockSls
};
