"use strict";

class Jetpack {
  constructor(serverless, options) {
    this.serverless = serverless;
    // TODO(jetpack): Confirm both of this is used.
    this.options = options;

    // Initialize internal state.
    this._setConfigSchema({ handler: serverless.configSchemaHandler });
    this.commands = this._getCommands();
    this.hooks = this._getHooks({ hooks: serverless.pluginManager.hooks });
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
              // TODO(jetpack): Implement report option
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

      // Determine if part of service or individual function packages.
      if (service.package.individually || cfg.package.individually) {
        functionsToPackage[name] = {
          msg: "TODO: PACKAGE INDIVIDUAL FUNCTION / ADD NEEDED INFO"
        };
      } else {
        serviceToPackage[name] = {
          msg: "TODO: PACKAGE SERVICE FUNCTION / ADD NEEDED INFO"
        };
      }
    });
    const layersToPackage = "TODO LAYERS";

    this.__config = {
      config: { service, functions, layers },
      "package": {
        service: serviceToPackage,
        functions: functionsToPackage,
        layers: layersToPackage
      },
      layers: "TODO"
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
  // Methods.
  // ==============================================================================================
  async package() {
    // TODO(jetpack): Remove
    const INDENT = 2;
    // eslint-disable-next-line no-console
    console.log("TODO(jetpack): package method called", JSON.stringify({
      config: this._config
    }, null, INDENT));

    // TODO: HERE GLOBAL
    // console.log("TODO SERVICE", this.serverless.service)
  }
}

module.exports = Jetpack;
