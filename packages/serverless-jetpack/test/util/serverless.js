"use strict";

const Serverless = require("serverless");

/**
 * Wrap serverless to allow "normal" usage with plugin injected.
 */
const createServerless = async ({ sandbox }) => {
  const serverless = new Serverless({
    options: {},
    commands: []
  });
  await serverless.init();
  serverless.cli = {
    log: sandbox.stub()
  };

  return serverless;
};

module.exports = {
  createServerless
};
