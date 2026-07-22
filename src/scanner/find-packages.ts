import { dirname, join, relative } from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";
import type { PackageInfo } from "../types.js";

async function readPackageInfo(
  packageJsonPath: string,
  rootDir: string,
  isRoot: boolean,
): Promise<PackageInfo | null> {
  try {
    const raw = (await fs.readJson(packageJsonPath)) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const packageDir = dirname(packageJsonPath);
    return {
      name: raw.name ?? relative(rootDir, packageDir) ?? "unknown",
      path: packageDir,
      packageJsonPath,
      dependencies: raw.dependencies ?? {},
      devDependencies: raw.devDependencies ?? {},
      isRoot,
    };
  } catch {
    return null;
  }
}

export async function findPackages(
  rootDir: string,
  workspacePatterns: string[],
): Promise<PackageInfo[]> {
  const rootPackageJsonPath = join(rootDir, "package.json");
  const packages: PackageInfo[] = [];

  const rootInfo = await readPackageInfo(rootPackageJsonPath, rootDir, true);
  if (rootInfo) {
    packages.push(rootInfo);
  }

  if (workspacePatterns.length === 0) {
    return packages;
  }

  const globs = workspacePatterns.map((pattern) => join(pattern, "package.json"));
  const matches = await fg(globs, {
    cwd: rootDir,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });

  for (const match of matches) {
    const info = await readPackageInfo(match, rootDir, false);
    if (info) {
      packages.push(info);
    }
  }

  return packages;
}