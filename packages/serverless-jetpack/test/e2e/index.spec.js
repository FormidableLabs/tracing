"use strict";

const { randomUUID } = require("crypto");
const os = require("os");
const path = require("path");

const fs = require("fs-extra");

const TMP = os.tmpdir();

describe("e2e/index", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(TMP, "serverless-jetpack", randomUUID());
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
    }
  });

  describe("TODO", () => {
    it("TODO E2E tests");
  });
});
