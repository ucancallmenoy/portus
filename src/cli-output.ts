import chalk from "chalk";
import type { ScanResult } from "./types.js";

export function printScanSummary(result: ScanResult): void {
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
}