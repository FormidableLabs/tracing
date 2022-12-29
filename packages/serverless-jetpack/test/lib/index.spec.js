"use strict";

const mock = require("mock-fs");
const { createSandbox } = require("sinon");

const { createServerless } = require("../util/serverless");
const { mockSls } = require("../util/mock-fs");
const { zipContents } = require("trace-pkg/test/util/file");


describe("lib/index", () => {
  let sandbox;
  let serverless;

  beforeEach(async () => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  describe("baseline", () => {
    // Note: This _doesn't_ use Jetpack. Just tests our SLS harness works.
    it("can do basic Serverless packaging", async () => {
      await mockSls({
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
      });

      serverless = await createServerless();
      await serverless.run();

      expect(zipContents(".serverless/sls-mocked.zip")).to.eql([
        "serverless.yml"
      ]);
    });
  });
});
