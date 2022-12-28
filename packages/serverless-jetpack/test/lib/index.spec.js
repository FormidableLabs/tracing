"use strict";

const path = require("path");

const mock = require("mock-fs");
const { createSandbox } = require("sinon");
const { createServerless } = require("../util/serverless");
const { zipContents } = require("trace-pkg/test/util/file");

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
    it("can do basic Serverless packaging", async function () {
      // TODO REMOVE
      this.timeout(5000); // eslint-disable-line no-magic-numbers,no-invalid-this

      // TODO: Abstract all of this / find a different solution to the lazy require() problem in SLS
      // Go to project root to load mocks.
      process.chdir(path.resolve(__dirname, "../../../../"));
      mock({
        packages: {
          "serverless-jetpack": {
            // We will end up here for CWD.
            "serverless.yml": `
              service: sls-mocked

              provider:
                name: aws
                runtime: nodejs16.x

              package:
                patterns:
                  - "!**"
                  - "serverless.yml"

              functions:
                one:
                  handler: one.handler
            `,
            node_modules: mock.load(path.resolve(__dirname, "../../node_modules"))
          }
        },
        node_modules: mock.load(path.resolve(__dirname, "../../../../node_modules"))
      });

      // Go back to package root for tests.
      process.chdir(path.resolve(__dirname, "../.."));

      serverless = await createServerless();

      await serverless.run();

      expect(zipContents(".serverless/sls-mocked.zip")).to.eql([
        "serverless.yml"
      ]);
    });
  });
});
