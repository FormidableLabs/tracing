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
      let start;
      start = Date.now();
      // TODO REMOVE
      this.timeout(5000); // eslint-disable-line no-magic-numbers,no-invalid-this

      // TODO: Abstract all of this / find a different solution to the lazy require() problem in SLS
      // Go to project root to load mocks.
      process.chdir(path.resolve(__dirname, "../../../../"));
      mock({
        packages: {
          "serverless-jetpack": {
            test: {
              // The AJV cache thing is stashed here.
              ".serverless": mock.load(path.resolve(__dirname, "../.serverless"))
            },
            "test-dir": {
              // We will end up here for CWD.
              "serverless.yml": `
                service: sls-mocked

                provider:
                  name: aws
                  runtime: nodejs16.x

                package:
                  include:
                    - "!**"
                    - "serverless.yml"

                functions:
                  one:
                    handler: one.handler
              `
            }
          }
        },
        node_modules: {
          ".pnpm": {
            "ajv@8.11.0": mock.load(path.resolve(__dirname, "../../../../node_modules/.pnpm/ajv@8.11.0")),
            "ajv-formats@2.1.1": mock.load(path.resolve(__dirname, "../../../../node_modules/.pnpm/ajv-formats@2.1.1")),
            "serverless@3.22.0": mock.load(path.resolve(__dirname, "../../../../node_modules/.pnpm/serverless@3.22.0")),
            "aws-sdk@2.1202.0": mock.load(path.resolve(__dirname, "../../../../node_modules/.pnpm/aws-sdk@2.1202.0"))
          }
        }
      });

      // Go back to package root for tests.
      process.chdir(path.resolve(__dirname, "../../test-dir"));
      console.log("mock()", Date.now() - start);

      start = Date.now();
      serverless = await createServerless();
      console.log("create()", Date.now() - start);

      start = Date.now();
      await serverless.run();
      console.log("run()", Date.now() - start);

      start = Date.now();
      expect(zipContents(".serverless/sls-mocked.zip")).to.eql([
        "serverless.yml"
      ]);
      console.log("unzip()", Date.now() - start);
    });
  });
});
