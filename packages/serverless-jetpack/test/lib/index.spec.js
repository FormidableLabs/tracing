"use strict";

const mock = require("mock-fs");
const { createSandbox } = require("sinon");

const { createServerless } = require("../util/serverless");

describe("lib/index", () => {
  let sandbox;
  let serverless;

  beforeEach(() => {
    mock({});
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();

    // [BRITTLE]: Manually reset the serverless lodash cache.
    // TODO: getServerlessConfigFile.cache = new Map();
  });

  describe("TODO", () => {
    it("TODO lib tests", async () => {
      serverless = await createServerless({ sandbox });
      console.log("TODO HERE", { serverless }); // eslint-disable-line no-console
    });
  });
});
