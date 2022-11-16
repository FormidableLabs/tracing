"use strict";

const mock = require("mock-fs");

const { findProdInstalls } = require("..");

describe("index", () => {
  beforeEach(() => {
    mock({});
  });

  afterEach(() => {
    mock.restore();
  });

  describe("findProdInstalls", () => {
    it("handles no dependencies", async () => {
      mock({
        "package.json": JSON.stringify({})
      });

      expect(await findProdInstalls()).to.eql([]);
    });
  });
});
