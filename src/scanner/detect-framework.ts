import type { FrameworkMatch, PackageInfo } from "../types.js";
import { FRAMEWORK_RULES } from "./frameworks.js";

function hasDependency(pkg: PackageInfo, name: string): boolean {
  return name in pkg.dependencies || name in pkg.devDependencies;
}

export function detectFramework(pkg: PackageInfo): FrameworkMatch | null {
  for (const rule of FRAMEWORK_RULES) {
    const matchesAll = rule.matchDependencies.every((dep) => hasDependency(pkg, dep));
    if (matchesAll) {
      return {
        id: rule.id,
        displayName: rule.displayName,
        category: rule.category,
        ...(rule.port !== undefined ? { port: rule.port } : {}),
      };
    }
  }
  return null;
}