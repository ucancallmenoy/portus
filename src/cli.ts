#!/usr/bin/env node

import { join } from "node:path";
import { cac } from "cac";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import { confirm } from "@inquirer/prompts";
import { scanRepo } from "./scanner/index.js";
import { generateDockerfile } from "./generators/generate-dockerfile.js";
import { selectPrimaryTarget } from "./generators/select-target.js";

const cli = cac("portus");

cli.command("init", "Initialize a Docker project").action(async () => {
  console.log(chalk.cyan("🚢 Portus"));

  const spinner = ora("Scanning repository...").start();
  const result = await scanRepo(process.cwd());
  spinner.succeed("Scan complete");

  console.log();
  console.log(chalk.bold("Package manager:"), result.packageManager);
  console.log(
    chalk.bold("Runtime:"),
    `${result.runtime.runtime} ${result.runtime.nodeVersion}`,
    chalk.dim(`(${result.runtime.source})`),
  );
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

  const target = selectPrimaryTarget(result);
  if (!target) {
    console.log();
    console.log(chalk.red("No package.json found to generate a Dockerfile for."));
    return;
  }

  const dockerfileContent = generateDockerfile({
    packageManager: result.packageManager,
    runtime: result.runtime,
    target,
  });

  const dockerfilePath = join(target.path, "Dockerfile");

  if (await fs.pathExists(dockerfilePath)) {
    const overwrite = await confirm({
      message: `Dockerfile already exists at ${dockerfilePath}. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log(chalk.yellow("Skipped writing Dockerfile."));
      return;
    }
  }

  await fs.writeFile(dockerfilePath, dockerfileContent);
  console.log();
  console.log(chalk.green(`Dockerfile written to ${dockerfilePath}`));
});

cli.help();

cli.parse();