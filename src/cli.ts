#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import { confirm } from "@inquirer/prompts";
import { scanRepo } from "./scanner/index.js";
import { generateDockerfile } from "./generators/generate-dockerfile.js";
import { generateDockerignore } from "./generators/generate-dockerignore.js";
import { generateDockerCompose } from "./generators/generate-docker-compose.js";
import { selectPrimaryTarget } from "./generators/select-target.js";
import { runDoctor } from "./doctor/index.js";
import { printScanSummary } from "./cli-output.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const packageJsonPath = join(currentDir, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version: string };

const cli = cac("portus");
cli.version(packageJson.version);

async function writeGeneratedFile(
  filePath: string,
  content: string,
  label: string,
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm && (await fs.pathExists(filePath))) {
    const overwrite = await confirm({
      message: `${label} already exists at ${filePath}. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log(chalk.yellow(`Skipped writing ${label}.`));
      return;
    }
  }
  await fs.writeFile(filePath, content);
  console.log(chalk.green(`${label} written to ${filePath}`));
}

cli
  .command("init", "Initialize a Docker project")
  .option("-y, --yes", "Overwrite existing files without prompting")
  .action(async (options: { yes?: boolean }) => {
    console.log(chalk.cyan("Portus"));

    const spinner = ora("Scanning repository...").start();
    const result = await scanRepo(process.cwd());
    spinner.succeed("Scan complete");

    printScanSummary(result);

    const target = selectPrimaryTarget(result);
    if (!target) {
      console.log();
      console.log(chalk.red("No package.json found to generate Docker config for."));
      return;
    }

    const dockerfileResult = generateDockerfile({
      packageManager: result.packageManager,
      runtime: result.runtime,
      target,
    });
    const dockerignoreContent = generateDockerignore(target);
    const dockerComposeContent = generateDockerCompose(result, target);
    const skipConfirm = options.yes ?? false;

    console.log();
    await writeGeneratedFile(join(target.path, "Dockerfile"), dockerfileResult.content, "Dockerfile", skipConfirm);
    await writeGeneratedFile(join(target.path, ".dockerignore"), dockerignoreContent, ".dockerignore", skipConfirm);
    await writeGeneratedFile(
      join(result.root, "docker-compose.yaml"),
      dockerComposeContent,
      "docker-compose.yaml",
      skipConfirm,
    );

    if (dockerfileResult.warnings.length > 0) {
      console.log();
      for (const warning of dockerfileResult.warnings) {
        console.log(`${chalk.yellow("WARN")} ${warning}`);
      }
    }
  });

cli.command("scan", "Scan the repository and report detected setup without writing files").action(async () => {
  console.log(chalk.cyan("Portus"));

  const spinner = ora("Scanning repository...").start();
  const result = await scanRepo(process.cwd());
  spinner.succeed("Scan complete");

  printScanSummary(result);
});

cli.command("doctor", "Analyze existing Docker configuration for issues").action(async () => {
  const spinner = ora("Analyzing Docker configuration...").start();
  const reports = await runDoctor(process.cwd());
  spinner.succeed("Analysis complete");

  console.log();
  let errorCount = 0;
  let warningCount = 0;

  for (const report of reports) {
    console.log(chalk.bold(report.file));
    if (report.issues.length === 0) {
      console.log(`  ${chalk.green("OK")} No issues found.`);
    }
    for (const issue of report.issues) {
      if (issue.severity === "error") {
        errorCount += 1;
        console.log(`  ${chalk.red("ERROR")} ${issue.message}`);
      } else if (issue.severity === "warning") {
        warningCount += 1;
        console.log(`  ${chalk.yellow("WARN")} ${issue.message}`);
      } else {
        console.log(`  ${chalk.dim("INFO")} ${issue.message}`);
      }
    }
    console.log();
  }

  if (errorCount > 0) {
    console.log(chalk.red(`${errorCount} error(s), ${warningCount} warning(s) found.`));
    process.exitCode = 1;
  } else if (warningCount > 0) {
    console.log(chalk.yellow(`${warningCount} warning(s) found.`));
  } else {
    console.log(chalk.green("All checks passed."));
  }
});

cli.help();

cli.parse();