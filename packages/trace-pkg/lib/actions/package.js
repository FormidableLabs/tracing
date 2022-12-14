"use strict";

const pc = require("picocolors");
const yaml = require("yaml");
const { Worker } = require("jest-worker");

const { parseConfig } = require("../config");
const { debuglog, log, warn, error } = require("../log");
const debug = debuglog("trace-pkg:package");
const { serial } = require("../util/promise");
const { bundle } = require("../worker/bundle");
const { summarizeCollapsed } = require("../trace/collapsed");

// ----------------------------------------------------------------------------
// Helpers: Collapsed
// ----------------------------------------------------------------------------
const LINK_COLLAPSED_MISSES = pc.gray(pc.underline(
  "https://npm.im/trace-pkg#handling-collapsed-files"
));

const collapsedMsg = ({ key, type, numPkgs, numConflicts, numFiles }) => {
  const pkgs = numPkgs ? `${pc.green(numPkgs)}${pc.gray(" packages, ")}` : "";
  const conflicts = `${pc.red(numConflicts)}${pc.gray(" conflicts, ")}`;
  const files = `${pc.red(numFiles)}${pc.gray(" files")}`;
  return `Collapsed ${type} in ${pc.cyan(key)} (${pkgs}${conflicts}${files}): `;
};

// Summarize and log out collapsed information.
const summarizeAndLogCollapsed = ({ results }) => {
  let foundCollapsed = false;
  const summary = {};

  Object.entries(results).forEach(([key, { collapsed: { sources, dependencies } }]) => {
    summary[key] = {};

    const srcPaths = Object.keys(sources);
    if (srcPaths.length) {
      foundCollapsed = true;
      summary[key].sources = {
        numConflicts: srcPaths.length,
        numFiles: Object.values(sources).reduce((num, dups) => num + dups.length, 0)
      };

      warn(
        collapsedMsg({ key, type: "sources", ...summary[key].sources })
        + srcPaths.map((p) => pc.gray(p)).join(", ")
      );
    }

    const depNames = Object.keys(dependencies);
    if (depNames.length) {
      foundCollapsed = true;
      summary[key].dependencies = {
        numPkgs: depNames.length,
        numConflicts: 0,
        numFiles: 0
      };
      const deps = summary[key].dependencies;
      Object.values(dependencies).forEach(({ files }) => {
        deps.numConflicts += Object.keys(files).length;
        deps.numFiles += Object.values(files).reduce((num, dups) => num + dups.length, 0);
      });

      warn(
        collapsedMsg({ key, type: "dependencies", ...summary[key].dependencies })
        + depNames.map((p) => pc.gray(p)).join(", ")
      );
    }
  });

  if (foundCollapsed) {
    warn(`To address collapsed file conflicts, see logs & read: ${LINK_COLLAPSED_MISSES}`);
  }

  return summary;
};

const handleCollapsed = ({ packages, summary }) => {
  let collapsedError = false;
  Object.entries(packages).map(async ([key, pkg]) => {
    const { sources, dependencies } = summary[key];
    const totalConflicts = ((sources || {}).numConflicts || 0)
      + ((dependencies || {}).numConflicts || 0);
    if (pkg.collapsed.bail && totalConflicts > 0) {
      collapsedError = true;
      error(
        `Collapsed file conflicts in ${pc.cyan(key)}: `
        + `(${pc.gray(`${pc.red(totalConflicts)} total conflicts`)})`);
    }
  });

  if (collapsedError) {
    error(`Please see logs and read: ${LINK_COLLAPSED_MISSES}`);
    throw new Error("Collapsed file conflicts");
  }
};

// ----------------------------------------------------------------------------
// Helpers: Misses
// ----------------------------------------------------------------------------
const LINK_DYNAMIC_MISSES = pc.gray(pc.underline(
  "https://npm.im/trace-pkg#handling-dynamic-import-misses"
));

const logMisses = ({ results }) => {
  let foundDynamicMisses = false;
  Object.entries(results).forEach(([key, { misses: { missed = {}, sourceMaps = [] } = {} }]) => {
    // Dynamic misses.
    if (Object.keys(missed).length) {
      foundDynamicMisses = true;
      const dynamicMisses = Object.entries(missed)
        .map(([missFile, missList]) =>
          `- ${pc.yellow(missFile)}\n  ${pc.gray(missList.join("\n  "))}`
        )
        .join("\n");

      warn(`Dynamic misses in ${pc.cyan(key)}:\n${dynamicMisses}`);
    }

    // Source map misses (just log).
    if (sourceMaps.length) {
      const sourceMapMisses = sourceMaps
        .map((file) => `- ${pc.gray(file)}`)
        .join("\n");

      warn(`Missing source map files in ${pc.cyan(key)}:\n${sourceMapMisses}`);
    }
  });

  if (foundDynamicMisses) {
    warn(`To resolve dynamic import misses, see logs & read: ${LINK_DYNAMIC_MISSES}`);
  }
};

const handleMisses = ({ packages, results }) => {
  let unresolvedError = false;
  Object.entries(packages).map(async ([key, pkg]) => {
    const bail = pkg.traceOptions.dynamic.bail;
    const missed = Object.keys(results[key].misses.missed);

    if (bail && missed.length) {
      unresolvedError = true;
      error(
        `Unresolved dynamic misses in ${pc.cyan(key)}: ${pc.gray(JSON.stringify(missed))}`);
    }
  });

  if (unresolvedError) {
    error(`Please see logs and read: ${LINK_DYNAMIC_MISSES}`);
    throw new Error("Unresolved dynamic misses");
  }
};

// ----------------------------------------------------------------------------
// Helpers: Report
// ----------------------------------------------------------------------------
const prettyResults = (results) => {
  // Deep copy the results so we can mutate.
  results = JSON.parse(JSON.stringify(results));

  Object.entries(results).forEach(([key, { collapsed, misses: { missed } }]) => {
    results[key].collapsed = summarizeCollapsed({ collapsed });

    Object.entries(missed).forEach(([missFile, missList]) => {
      // Prettify miss sources.
      missed[missFile] = missList.map(
        ({ src, loc: { start: { line, column } } }) => `[${line}:${column}]: ${src}`
      );
    });
  });


  return results;
};

const highlight = (indent, color, prefix = "") => [
  new RegExp(`^([ ]{${indent}}[^ ]{1}.*):`, "gm"),
  (_, val) => `${prefix}${pc[color](val)}:`
];
const highlightMiss = () => [
  /^( {8}- \")(\[[0-9]+:[0-9]+\])(: )(.*?)(\")$/gm,
  // eslint-disable-next-line max-params
  (_, v1, v2, v3, v4, v5) => `${v1}${pc.yellow(v2)}${v3}${pc.gray(v4)}${v5}`
];

const bundleReport = ({ config, concurrency, dryRun, results }) => {
  /* eslint-disable no-magic-numbers */
  const configStr = yaml.stringify({
    concurrency,
    dryRun,
    config
  })
    .replace(...highlight(0, "green"))
    .replace(...highlight(2, "gray"));

  const reportStr = yaml.stringify(results)
    .replace(...highlight(0, "cyan", "\n"))
    .replace(...highlight(2, "green"))
    .replace(...highlight(4, "gray"))
    .replace(...highlightMiss());

  /* eslint-enable no-magic-numbers */
  return `
${pc.blue("## Configuration")}

${configStr}
${pc.blue("## Output")}
${reportStr}`.trim();
};

// ----------------------------------------------------------------------------
// Helpers: Concurrency
// ----------------------------------------------------------------------------
const createRunner = ({ concurrency }) => {
  // Run serially in band.
  if (concurrency === 1) {
    return {
      isWorker: false,
      bundle,
      run: serial
    };
  }

  // Run concurrently.
  const worker = new Worker(require.resolve("../worker/bundle"), { numWorkers: concurrency });
  return {
    isWorker: true,
    bundle: worker.bundle,
    run: async (tasks) => {
      await Promise.all(tasks.map((task) => task()))
        .catch((err) => {
          worker.end();
          throw err;
        });
      worker.end();
    }
  };
};

// ----------------------------------------------------------------------------
// Action: Package
// ----------------------------------------------------------------------------
const createPackage = async ({ opts: { config, concurrency, report, dryRun } = {} } = {}) => {
  const plan = await parseConfig({ config, concurrency });
  concurrency = plan.concurrency;

  // Bundle tasks.
  // Pre-seed results to guarantee key order.
  const rawResults = Object.entries(plan.packages).reduce((memo, [key, pkg]) => {
    memo[key] = { plan: pkg };
    return memo;
  }, {});
  const runner = createRunner({ concurrency });
  await runner.run(Object.entries(plan.packages).map(([key, pkg]) => async () => {
    const { cwd, output, trace, traceOptions, include } = pkg;
    const worker = pc.gray(`[${runner.isWorker ? "w" : "s"}]`);
    debug(`${worker} Start bundle for: ${pc.cyan(key)}`);

    const bundleResults = await runner.bundle({
      cwd,
      output,
      trace,
      traceOptions,
      include,
      dryRun
    });

    const { workerId } = bundleResults.output;
    const mode = pc.gray(workerId ? `[w${pc.green(workerId)}]` : "[s]");
    debug(`${mode} Finished bundle for ${pc.cyan(key)}`);

    // Update results.
    Object.assign(rawResults[key], bundleResults);
  }));

  // Create prettified copy of results for better console output.
  const results = prettyResults(rawResults);

  // Handle error/warn cases.
  const collapsedSummary = summarizeAndLogCollapsed({ results });
  logMisses({ results });

  if (report) {
    // The report unconditionally logs out even with `--silent` flag.
    // eslint-disable-next-line no-console
    console.log(bundleReport({ config, concurrency, dryRun, results }));
  } else {
    const prefix = dryRun ? `${pc.gray("[dry-run]")} Would create` : "Created";
    log(`${prefix} ${pc.green(Object.keys(results).length)} packages:`);

    Object.entries(results).forEach(([key, { output: { relPath, files } }]) => {
      log(`- ${pc.cyan(key)}: ${relPath} (${pc.green(files.length)} ${pc.gray("files")})`);
    });
  }

  // Bail on unresolved dynamic misses.
  handleCollapsed({ packages: plan.packages, summary: collapsedSummary });
  handleMisses({ packages: plan.packages, results });
};

module.exports = {
  "package": createPackage
};
