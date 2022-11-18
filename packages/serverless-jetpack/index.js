"use strict";

const path = require("path");
const { findProdInstalls } = require("inspectdep");
const { setLoggingOptions } = require("trace-pkg/lib/log");
const { "package": createPackage } = require("trace-pkg/lib/actions/package");

const PLUGIN_NAME = require("./package.json").name;
const SLS_TMP_DIR = ".serverless";

// Helpers
const isBin = (dep) => dep.indexOf(path.join("node_modules", ".bin")) > -1;

const getProdPatterns = async () => {
  // TODO(JETPACK): Do all real root finding, etc.
  const cwd = process.cwd();
  const rootPath = cwd;
  const prodInstalls = await findProdInstalls({ rootPath, curPath: cwd });

  return prodInstalls
    // Relativize to root path for inspectdep results, the cwd for glob.
    .map((dep) => path.relative(cwd, path.join(rootPath, dep)))
    // Sort for proper glob order.
    .sort()
    // 1. Convert to `PATH/**` glob.
    // 2. Add excludes for node_modules in every discovered pattern dep
    //    dir. This allows us to exclude devDependencies because
    //    **later** include patterns should have all the production deps
    //    already and override.
    .map((dep) => isBin(dep)
      ? [dep] // **don't** glob bin path (`ENOTDIR: not a directory`)
      : [path.join(dep, "**"), `!${path.join(dep, "node_modules", "**")}`]
    )
    // Flatten the temp arrays we just introduced.
    .reduce((m, a) => m.concat(a), []);
};

// Plugin
class Jetpack {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    // Initialize internal state.
    this._setConfigSchema({ handler: serverless.configSchemaHandler });
    this.commands = this._getCommands();
    this.hooks = this._getHooks({ hooks: serverless.pluginManager.hooks });

    // Override trace-pkg logging.
    setLoggingOptions({
      loggers: {
        log: (...args) => this._log(...args),
        debug: (...args) => this._logDebug(...args),
        warning: (...args) => this._logWarning(...args)
      }
    });
  }

  // ==============================================================================================
  // Constructor helpers.
  // ==============================================================================================
  _getCommands() {
    return {
      jetpack: {
        usage: "Alternate Serverless packager",
        commands: {
          "package": {
            usage: "Packages a Serverless service or function",
            lifecycleEvents: [
              "package"
            ],
            options: {
              // TODO(jetpack): Implement function option
              "function": {
                usage: "Function name. Packages a single function (see 'deploy function')",
                shortcut: "f",
                type: "string"
              },
              // TODO(jetpack): Document report option. (Implemented!)
              report: {
                usage: "Generate full bundle report",
                shortcut: "r",
                type: "boolean"
              }
            }
          }
        }
      }
    };
  }

  _getHooks({ hooks }) {
    const pluginName = this.constructor.name;
    const hook = this.package.bind(this);
    const configHook = this._setConfig.bind(this);

    // The `ServerlessEnterprisePlugin` awkwardly wreaks havoc with alternative
    // packaging.
    //
    // `serverless` special cases it and ensures it's _always_ the last plugin.
    // This means that our plugin order ends up looking like:
    //
    // - ...
    // - 'Package',
    // - ...
    // - 'Jetpack',
    // - 'ServerlessEnterprisePlugin'
    //
    // Unfortunately, the plugin hooks end up like this:
    //
    // - `Jetpack:before:package:createDeploymentArtifacts`:
    //   Bundles all files, creating artifact to avoid `Package` doing it.
    // - `ServerlessEnterprisePlugin:before:package:createDeploymentArtifacts`:
    //   Creates the `s_<NAME>.js` wrapper files.
    // - `Package:package:createDeploymentArtifacts`:
    //   Creates any artifacts that don't already exist.
    //
    // This means that Jetpack can't easily get both the SFE wrappers and still
    // control packaging:
    //
    // - If Jetpack stays with `before:package:createDeploymentArtifacts`
    //   it misses the `s_<NAME>.js` wrapper files.
    // - _But_, if Jetpack hooks to `package:createDeploymentArtifacts` then
    //  `Package` will actually perform real packaging and it's too late.
    //
    // To get around this awkward situation, we create a hooks object that is
    // delayed until the `initialize` lifecycle, then patched in last. This
    // ensures that Jetpack's hooks run absolutely last for these events. This
    // is still a bit hacky, but not nearly as invasive as some of the other
    // approaches we considered. H/T to `@medikoo` for the strategy:
    // https://github.com/FormidableLabs/serverless-jetpack/pull/68#issuecomment-556987101
    return {
      // Packaging hooks.
      // Use delayed hooks to guarantee we are **last** to run so other things
      // like the Serverless Enterprise plugin run before us.
      initialize: () => {
        [
          "before:package:createDeploymentArtifacts",
          "before:package:function:package"
        ].forEach((event) => {
          hooks[event] = (hooks[event] || []).concat({ pluginName, hook });
        });
      },
      // Our custom hook is fine with normal injection.
      "before:jetpack:package:package": configHook,
      "jetpack:package:package": hook,

      // Configuration initialization hooks.
      "after:package:initialize": configHook
    };
  }

  // ==============================================================================================
  // Config.
  // ==============================================================================================
  _setConfigSchema({ handler }) {
    // We're presently keeping just `custom` and `function` configuration properties
    // as that's what existing Jetpack has. Here's a snippet of how to add a top-level
    // property for later:
    //
    // ```js
    // // Define the top level property.
    // const configName = this.constructor.name.toLocaleLowerCase();
    // handler.defineTopLevelProperty(configName, {
    //   type: "object",
    //   properties: {
    //     global: { type: "string" }
    //   }
    // });
    // // Accessible within lifecycle via:
    // this.serverless.configurationInput.jetpack
    // ```

    // Custom.
    handler.defineCustomProperties({
      type: "object",
      properties: {
        jetpack: {
          type: "object",
          properties: {
            custom: { type: "string" } // TODO(jetpack): Implement real props.
          }
        }
      }
    });

    // Function.
    const providerName = this.serverless.service.provider.name;
    handler.defineFunctionProperties(providerName, {
      type: "object",
      properties: {
        jetpack: {
          type: "object",
          properties: {
            "function": { type: "string" } // TODO(jetpack): Implement real props.
          }
        }
      }
    });

    // TODO(jetpack): Also config for layers.
  }

  // Get resolved config values.
  //
  // **Notable values**:
  // - `isNode`: If `true` then Node, if `false` then not Node, if `null` then unset.
  //
  // **Note**: Only use in lifecycle events.
  //
  // See, e.g. https://www.serverless.com/framework/docs/guides/plugins/custom-configuration
  // > Note: configuration values are only resolved after plugins are initialized.
  // > Do not try to read configuration in the plugin constructor, as variables aren't resolved yet.
  // > Read configuration in lifecycle events only.
  _setConfig() {
    // Shortcuts.
    const svc = this.serverless.service;

    // Actual config.
    const service = {
      "package": {
        individually: !!svc.package.individually
      },
      isNode: svc.provider.runtime ? svc.provider.runtime.startsWith("node") : null,
      jetpack: svc.custom.jetpack || {}
    };
    const functions = Object.entries(svc.functions).reduce((memo, [name, cfg]) => {
      const fn = svc.getFunction(name);
      const fnPkg = fn.package || {};
      memo[name] = {
        "package": {
          disable: !!fnPkg.disable,
          individually: !!fnPkg.individually,
          artifact: fnPkg.artifact || null
        },
        isNode: fn.runtime ? fn.runtime.startsWith("node") : null,
        jetpack: cfg.jetpack || {}
      };

      return memo;
    }, {});
    const layers = "TODO LAYERS";

    // Things we actually want to package
    const serviceToPackage = {};
    const functionsToPackage = {};
    Object.entries(functions).forEach(([name, cfg]) => {
      // Only consider Node.js fns that actually need packaging.
      if (cfg.isNode === false || cfg.isNode === null && service.isNode !== true) { return; }
      if (cfg.package.disable || cfg.package.artifact) { return; }

      // Packaging information.
      const fn = svc.getFunction(name);
      // We extract handler file name pretty analogously to how serverless does it.
      const handler = `${fn.handler.replace(/\.[^\.]+$/, "")}{,.*js}`;
      const pkgObj = {
        handler
      };

      // Determine if part of service or individual function packages.
      if (service.package.individually || cfg.package.individually) {
        functionsToPackage[name] = pkgObj;
      } else {
        serviceToPackage[name] = pkgObj;
      }
    });
    const layersToPackage = "TODO LAYERS";

    this.__config = {
      // TODO: Do we need to pass this on?
      config: { service, functions, layers },
      "package": {
        service: serviceToPackage,
        functions: functionsToPackage,
        layers: layersToPackage
      }
    };
  }

  // Lazy getter
  get _config() {
    if (!this.__config) {
      throw new Error("Configuration is not available yet.");
    }

    return this.__config;
  }


  // ==============================================================================================
  // Logging.
  // ==============================================================================================
  _log(msg, opts) {
    const { cli } = this.serverless;
    cli.log(`[${PLUGIN_NAME}] ${msg}`, null, opts);
  }

  _logDebug(msg) {
    if (process.env.SLS_DEBUG) {
      this._log(msg);
    }
  }

  _logWarning(msg) {
    const { cli } = this.serverless;
    cli.log(`[${PLUGIN_NAME}] WARNING: ${msg}`, null, { color: "red" });
  }

  // ==============================================================================================
  // Methods.
  // ==============================================================================================
  // eslint-disable-next-line max-statements
  async package() {
    const { "package": { service, functions } } = this._config;
    const cwd = process.cwd(); // TODO: Figure this out more.
    const svc = this.serverless.service;
    const options = this.options || {};
    const report = !!options.report;

    // TODO(JETPACK): Remove handler from the code (?)
    // TODO(JETPACK): Figure out default SLS includes and if we still want to do this (???)

    // Create trace-pkg configuration for packaging.
    const packages = {};

    // Service
    if (Object.entries(service).length) {
      const output = path.join(SLS_TMP_DIR, `${svc.service}.zip`);

      // Add to config.
      packages[svc.service] = {
        cwd,
        output,
        include: [].concat(
          Object.values(service).map((cfg) => cfg.handler),
          await getProdPatterns()
        )
      };

      // Mark artifact
      svc.package = svc.package || {};
      svc.package.artifact = output;
    }

    // Functions
    if (Object.entries(functions).length) {
      await Promise.all(Object.entries(functions).map(async ([functionName, cfg]) => {
        const output = path.join(SLS_TMP_DIR, `${functionName}.zip`);

        // Add to config.
        packages[functionName] = {
          cwd,
          output,
          include: [].concat(
            cfg.handler,
            await getProdPatterns()
          )
        };

        // Mark artifact
        const fn = svc.getFunction(functionName);
        fn.package = fn.package || {};
        fn.package.artifact = output;
      }));
    }

    // Layers TODO

    // Excute all packaging.
    await createPackage({
      opts: {
        report,
        config: {
          packages
        }
      }
    });
  }
}

module.exports = Jetpack;
