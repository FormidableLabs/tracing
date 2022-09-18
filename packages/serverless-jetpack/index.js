"use strict";

class Jetpack {
  constructor(serverless, options) {
    // TODO(jetpack): Confirm both of these are used.
    this.serverless = serverless;
    this.options = options;

    // Initialize internal state.
    this.commands = this._getCommands();
    this.config = this._getConfig( { handler: serverless.configSchemaHandler });
    this.hooks = this._getHooks({ hooks: serverless.pluginManager.hooks });
  }

  // Constructor helpers.
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

  _getConfig({ handler }) {
    const configName = this.constructor.name.toLocaleLowerCase();

    // Define properties. All presently the same.
    // TODO(jetpack): Real properties, in a loop.
    handler.defineTopLevelProperty(configName, {
      type: 'object',
      properties: {
        global: { type: 'string' },
      }
    });
    handler.defineCustomProperties({
      type: 'object',
      properties: {
        jetpack: {
          type: 'object',
          properties: {
            custom: { type: 'string' },
          }
        }
      }
    });
    handler.defineFunctionProperties(configName, {
      type: 'object',
      properties: {
        "function": { type: 'string' },
      }
    });

    // TODO(jetpack): Also config for layers.
  }

  _getHooks({ hooks }) {
    const pluginName = this.constructor.name;
    const hook = this.package.bind(this);

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
      "jetpack:package:package": hook
    };
  }

  async package() {
    const config = {
      // global: this.serverless.service,
      custom: this.serverless.service.custom.jetpack || {},
      functions: Object.entries(this.serverless.service.functions).reduce((memo, [name, cfg]) => {
        memo[name] = cfg.jetpack || {};
        return memo;
      }, {})
    };

    // TODO(jetpack): Remove
    // eslint-disable-next-line no-console
    console.log("TODO(jetpack): package method called", JSON.stringify({
      config
    }, null, 2));

    // TODO: HERE GLOBAL
    console.log("TODO SERVICE", this.serverless.service)
  }
}

module.exports = Jetpack;
