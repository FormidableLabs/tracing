"use strict";

const path = require("path");

const mock = require("mock-fs");
const { createSandbox } = require("sinon");
const { loadImports, createServerless } = require("../util/serverless");
const { zipContents } = require("trace-pkg/test/util/file");

describe("lib/index", () => {
  let sandbox;
  let serverless;

  before(async () => {
    // Force all file imports any file mocking.
    await loadImports();
  });

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
            "test": {
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
            },
            //node_modules: mock.load(path.resolve(__dirname, "../../node_modules"))
          }
        },
        //node_modules: mock.load(path.resolve(__dirname, "../../../../node_modules"))
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
