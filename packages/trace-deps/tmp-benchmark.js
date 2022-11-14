"use strict";

// TODO(EXT): REMOVE + REMOVE DEPS
const path = require("path");
const Benchmark = require("benchmark");
const { log } = console;

// Impls
const NOT_JS_EXTS_ARR = [".js.map", ".graphql", ".json", ".node"];
const NOT_JS_EXTS_SET = new Set(NOT_JS_EXTS_ARR);

const IMPLS = {
  existing: (filePath) => NOT_JS_EXTS_SET.has(path.extname(filePath)),
  arrIncludes: (filePath) => NOT_JS_EXTS_ARR.includes(path.extname(filePath)),
  arrEndsWith: (filePath) => NOT_JS_EXTS_ARR.some((ext) => filePath.endsWith(ext))
};

Object.entries(IMPLS)
  // add tests
  .reduce((suite, [name, fn]) => suite.add(name, () => {
    fn("hi.jpg");
    // fn("hi/ho/fum.js");
    // fn("hi/ho/no-extension");
    // fn("ho/hi.node");
    // fn("blah/code.js.map");
    // fn("hi.jpg");
    // fn("hi/ho/fum.js");
    // fn("hi/ho/no-extension");
    // fn("ho/hi.node");
    // fn("blah/code.js.map");
  }), new Benchmark.Suite())
  // add listeners
  .on("cycle", (event) => {
    log(String(event.target));
  })
  .on("complete", function () {
    // eslint-disable-next-line  no-invalid-this
    log(`Fastest is ${this.filter("fastest").map("name")}`);
  })
  // run async
  .run({ async: true });
