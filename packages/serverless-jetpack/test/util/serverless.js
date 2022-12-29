"use strict";

const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

const Serverless = require("serverless");
const readConfiguration = require("serverless/lib/configuration/read");
const resolveConfigurationPath = require("serverless/lib/cli/resolve-configuration-path");
const { stub } = require("sinon");

// [BRITTLE]: Various lazy requires in `init()` which conflict with mock-fs, so we import other
// files that force the early imports.
require("serverless/lib/cli/handle-error");
require("serverless/lib/plugins");
require("serverless/lib/utils/aws-sdk-patch");
require("serverless/lib/plugins/aws/package/compile/events/s3/config-schema");
// Ugh, we have to call a function to force a lazy-load internally in Serverless
// TODO: HERE -- Note that the schema is then _hashed_ into the AJV thing which is going to be a tough moving target.
const resolveAjvValidate = require("serverless/lib/classes/config-schema-handler/resolve-ajv-validate");

const loadImports = async () => {
  // This does AJV requires _and_ writes to a file-based cache.
  // We're going to write (out of git) to our test directory.
  process.env.SLS_SCHEMA_CACHE_BASE_DIR = path.resolve(__dirname, "..");
  await resolveAjvValidate({});
  console.log("TODO HERE DONE")
};

// require("ajv/package.json");
// require("ajv-formats/package.json");
// require("ajv-formats");

// console.log("TODO HERE", {
//   "ajv-formats": require.resolve("ajv-formats")
// })

// Wrap serverless to allow "normal" usage with plugin injected.
const createServerless = async ({ options = {}, commands = ["package"] } = {}) => {
  // Mimic `serverless.js` CLI script setup.
  const serviceDir = process.cwd();
  const configurationPath = await resolveConfigurationPath();
  const configurationFilename = configurationPath.slice(serviceDir.length + 1);
  const configuration = await readConfiguration(configurationPath);

  const serverless = new Serverless({
    serviceDir,
    options,
    commands,
    configuration,
    configurationFilename
  });

  await serverless.init();
  serverless.cli = {
    log: stub()
  };

  // TODO: Refactor to maybe be { serverless, restore }
  return serverless;
};

module.exports = {
  loadImports,
  createServerless
};
