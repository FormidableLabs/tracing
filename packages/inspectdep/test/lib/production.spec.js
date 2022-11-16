"use strict";

const path = require("path");
const mock = require("mock-fs");

const { findProdInstalls } = require("../../lib/production");

// Normalize paths for windows.
const normalize = (arr) => arr.map((item) => path.normalize(item));

describe("lib/production", () => {
  beforeEach(() => {
    mock({});
  });

  afterEach(() => {
    mock.restore();
  });

  describe("findProdInstalls", () => {
    it("throws on empty root directory with default path", () =>
      expect(findProdInstalls()).to.be.rejectedWith("Unable to find package.json")
    );

    it("throws on bad package.json", async () => {
      mock({
        "package.json": "BAD_JSON"
      });

      await expect(findProdInstalls()).to.be.rejectedWith("Unexpected token");
    });

    it("handles no dependencies", async () => {
      mock({
        "package.json": JSON.stringify({})
      });

      expect(await findProdInstalls()).to.eql([]);
    });

    it("handles uninstalled dependencies", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            foo: "^1.2.3"
          }
        })
      });

      expect(await findProdInstalls()).to.eql([]);
    });

    it("handles uninstalled optionalDependencies", async () => {
      mock({
        "package.json": JSON.stringify({
          optionalDependencies: {
            foo: "^1.2.3"
          }
        })
      });

      expect(await findProdInstalls()).to.eql([]);
    });

    it("handles nested dependencies and optionalDependencies", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            bar: "^1.2.3"
          },
          optionalDependencies: {
            foo: "^1.2.3"
          },
          devDependencies: {
            baz: "^1.2.3"
          }
        }),
        node_modules: {
          ".bin": {
            baz: "a symlink to cli/baz.js",
            foo: "a symlink to cli/foo.js",
            "should-not-be-included": "shouldn't have this"
          },
          bar: {
            "package.json": JSON.stringify({
              dependencies: {
                baz: "^1.2.3"
              }
            }),
            node_modules: {
              baz: {
                "package.json": JSON.stringify({
                  bin: {
                    baz: "cli/baz.js"
                  }
                })
              },
              "should-also-not-be-included": {
                "package.json": JSON.stringify({})
              }
            }
          },
          // This one should not be included. It's already nested.
          baz: {
            "package.json": JSON.stringify({})
          },
          foo: {
            "package.json": JSON.stringify({
              name: "foo",
              bin: "./cli/foo.js"
            })
          },
          "should-not-be-included": {
            "package.json": JSON.stringify({})
          }
        }
      });

      expect(await findProdInstalls()).to.eql(normalize([
        "node_modules/.bin/baz",
        "node_modules/.bin/foo",
        "node_modules/bar",
        "node_modules/bar/node_modules/baz",
        "node_modules/foo"
      ]));
    });

    it("handles flattened dependencies and optionalDependencies", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            bar: "^1.2.3"
          },
          optionalDependencies: {
            foo: "^1.2.3"
          }
        }),
        node_modules: {
          ".bin": {
            baz: "a symlink to cli/baz.js",
            "should-not-be-included": "shouldn't have this"
          },
          bar: {
            "package.json": JSON.stringify({
              dependencies: {
                baz: "^1.2.3"
              }
            })
          },
          baz: {
            "package.json": JSON.stringify({
              bin: {
                baz: "cli/baz.js"
              }
            })
          },
          foo: {
            "package.json": JSON.stringify({})
          },
          "should-not-be-included": {
            "package.json": JSON.stringify({})
          }
        }
      });

      expect(await findProdInstalls()).to.eql(normalize([
        "node_modules/.bin/baz",
        "node_modules/bar",
        "node_modules/baz",
        "node_modules/foo"
      ]));
    });

    it("handles scoped packages", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            "@scope/bar": "^1.2.3"
          },
          optionalDependencies: {
            "@bunny/foo": "^1.2.3"
          }
        }),
        node_modules: {
          "@scope": {
            bar: {
              "package.json": JSON.stringify({
                dependencies: {
                  baz: "^1.2.3"
                }
              })
            },
            "scoped-should-not-be-included": {
              "package.json": JSON.stringify({})
            }
          },
          baz: {
            "package.json": JSON.stringify({})
          },
          "@bunny": {
            foo: {
              "package.json": JSON.stringify({})
            }
          },
          "should-not-be-included": {
            "package.json": JSON.stringify({})
          }
        }
      });

      expect(await findProdInstalls()).to.eql(normalize([
        "node_modules/@bunny/foo",
        "node_modules/@scope/bar",
        "node_modules/baz"
      ]));
    });

    it("detects simple circular dependencies", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            bar: "^1.2.3",
            foo: "^1.2.3"
          }
        }),
        node_modules: {
          bar: {
            "package.json": JSON.stringify({
              dependencies: {
                foo: "^1.2.3"
              }
            })
          },
          foo: {
            "package.json": JSON.stringify({
              dependencies: {
                bar: "^1.2.3"
              }
            })
          },
          "should-not-be-included": {
            "package.json": JSON.stringify({})
          }
        }
      });

      expect(await findProdInstalls()).to.eql(normalize([
        "node_modules/bar",
        "node_modules/foo"
      ]));
    });

    it("detects multi-level circular dependencies", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            bar: "^1.2.3",
            "nested-foo": "^1.2.3"
          }
        }),
        node_modules: {
          bar: {
            "package.json": JSON.stringify({
              dependencies: {
                "nested-foo": "^1.2.3"
              }
            })
          },
          foo: {
            "package.json": JSON.stringify({
              dependencies: {
                bar: "^1.2.3"
              }
            })
          },
          "nested-foo": {
            "package.json": JSON.stringify({
              dependencies: {
                foo: "^1.2.3"
              }
            })
          },
          "should-not-be-included": {
            "package.json": JSON.stringify({})
          }
        }
      });

      expect(await findProdInstalls()).to.eql(normalize([
        "node_modules/bar",
        "node_modules/foo",
        "node_modules/nested-foo"
      ]));
    });

    it("handles symlinks", async () => {
      mock({
        "package.json": JSON.stringify({
          dependencies: {
            "@scope/bar": "^1.2.3",
            foo: "^2.3.4"
          }
        }),
        node_modules: {
          "@scope": {
            bar: mock.symlink({
              path: "../../lib/bar"
            })
          },
          foo: {
            "package.json": JSON.stringify({})
          }
        },
        lib: {
          bar: {
            "package.json": JSON.stringify({
              dependencies: {
                baz: "^1.2.3"
              }
            }),
            node_modules: {
              baz: {
                "package.json": JSON.stringify({})
              }
            }
          }
        }
      });

      expect(await findProdInstalls()).to.eql(normalize([
        "node_modules/@scope/bar",
        "node_modules/@scope/bar/node_modules/baz",
        "node_modules/foo"
      ]));
    });

    it("handles symlinks and monorepos", async () => {
      mock({
        "package.json": JSON.stringify({}),
        packages: {
          "my-pkg": {
            "package.json": JSON.stringify({
              dependencies: {
                "@scope/bar": "^1.2.3",
                foo: "^2.3.4"
              }
            })
          }
        },
        node_modules: {
          "@scope": {
            bar: mock.symlink({
              path: "../../lib/bar"
            })
          },
          foo: {
            "package.json": JSON.stringify({})
          }
        },
        lib: {
          bar: {
            "package.json": JSON.stringify({
              dependencies: {
                baz: "^1.2.3"
              }
            }),
            node_modules: {
              baz: {
                "package.json": JSON.stringify({})
              }
            }
          }
        }
      });

      expect(await findProdInstalls({ curPath: path.resolve("packages/my-pkg") }))
        .to.eql(normalize([
          "node_modules/@scope/bar",
          "node_modules/@scope/bar/node_modules/baz",
          "node_modules/foo"
        ]));
    });
  });
});
