#!/usr/bin/env node

import { cac } from "cac";
import chalk from "chalk";
import ora from "ora";
import { scanRepo } from "./scanner/index.js";

const cli = cac("portus");

cli.command("init", "Initialize a Docker project").action(async () => {
  console.log(chalk.cyan("🚢 Portus"));

  const spinner = ora("Scanning repository...").start();
  const result = await scanRepo(process.cwd());
  spinner.succeed("Scan complete");

  console.log();
  console.log(chalk.bold("Package manager:"), result.packageManager);
  console.log(chalk.bold("Monorepo:"), result.monorepo.isMonorepo ? "yes" : "no");

  if (result.monorepo.isMonorepo) {
    console.log(chalk.bold("Workspace source:"), result.monorepo.workspaceSource);
    if (result.monorepo.orchestrator) {
      console.log(chalk.bold("Orchestrator:"), result.monorepo.orchestrator);
    }
  }

  console.log(chalk.bold("Packages found:"), result.monorepo.packages.length);
  for (const pkg of result.monorepo.packages) {
    const tag = pkg.isRoot ? chalk.dim(" (root)") : "";
    const frameworkLabel = pkg.framework
      ? chalk.magenta(` [${pkg.framework.displayName}]`)
      : chalk.dim(" [no framework detected]");
    console.log(`  ${chalk.green("-")} ${pkg.name}${tag}${frameworkLabel}`);
  }
});

cli.help();

cli.parse();