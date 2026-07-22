import { join } from "node:path";
import fs from "fs-extra";
import { detectPackageManager } from "./package-manager.js";
import { detectWorkspaces } from "./workspaces.js";
import { findPackages } from "./find-packages.js";
import type { ScanResult } from "../types.js";

export async function scanRepo(rootDir: string): Promise<ScanResult> {
  const rootPackageJsonPath = join(rootDir, "package.json");
  const rootPackageJson = (await fs.pathExists(rootPackageJsonPath))
    ? await fs.readJson(rootPackageJsonPath)
    : {};

  const packageManager = detectPackageManager(rootDir);
  const workspaceConfig = detectWorkspaces(rootDir, rootPackageJson);
  const packages = await findPackages(rootDir, workspaceConfig.patterns);

  return {
    root: rootDir,
    packageManager,
    monorepo: {
      isMonorepo: workspaceConfig.patterns.length > 0,
      workspaceSource: workspaceConfig.source,
      patterns: workspaceConfig.patterns,
      orchestrator: workspaceConfig.orchestrator,
      packages,
    },
  };
}