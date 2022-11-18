/* eslint-disable no-console */

"use strict";

const { yellow, red } = require("picocolors");
const util = require("util");

let _enabled = true;
const _loggers = {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args)
};

const setLoggingOptions = ({ silent, loggers }) => {
  if (typeof silent !== "undefined") {
    _enabled = !silent;
  }
  if (typeof loggers !== "undefined") {
    Object.assign(_loggers, loggers);
  }
};

const debuglog = function (namespace) {
  let debug;

  return (...args) => {
    // Lazy initialize logger.
    if (!debug) {
      debug = util.debuglog(namespace);
    }

    return _enabled && debug(...args);
  };
};

const log = (...args) => _enabled && _loggers.log(...args);

const warn = (...args) => _enabled && _loggers.log(yellow("WARN"), ...args);

const error = (...args) => _enabled && _loggers.error(red("ERROR"), ...args);

module.exports = {
  debuglog,
  log,
  warn,
  error,
  setLoggingOptions
};
