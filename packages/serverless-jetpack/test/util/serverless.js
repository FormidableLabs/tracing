"use strict";

const Serverless = require("serverless");
const readConfiguration = require("serverless/lib/configuration/read");
const resolveConfigurationPath = require("serverless/lib/cli/resolve-configuration-path");
const { stub } = require("sinon");

// [BRITTLE]: Various lazy requires in `init()` which conflict with mock-fs, so we import other
// files that force the early imports.
require("serverless/lib/cli/handle-error");
require("serverless/lib/plugins");

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
  serverless.cli = Object.assign(serverless.cli, {
    log: stub()
  });
  serverless.service = Object.assign(serverless.service, {
    // Validate is super-slow! (~1sec)
    validate: stub()
  });

  // TODO: Refactor to maybe be { serverless, restore }
  return serverless;
};

module.exports = {
  createServerless
};
