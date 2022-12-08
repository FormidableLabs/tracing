"use strict";

const Serverless = require("serverless");

// [BRITTLE]: Various lazy requires in `init()` which conflict with mock-fs, so we import other
// files that force the early imports.
// - lazy `require("@serverless/dashboard-plugin'")`
require("serverless/lib/cli/handle-error");
// - lazy `require("serverless/lib/plugins")`
require("serverless/lib/plugins");

// Wrap serverless to allow "normal" usage with plugin injected.
const createServerless = async ({ sandbox }) => {
  const serverless = new Serverless({
    options: {},
    commands: []
  });
  await serverless.init();
  serverless.cli = {
    log: sandbox.stub()
  };

  // TODO: Refactor to maybe be { serverless, restore }
  return serverless;
};

module.exports = {
  createServerless
};
