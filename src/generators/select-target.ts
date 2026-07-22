import type { PackageInfo, ScanResult } from "../types.js";

export function selectPrimaryTarget(result: ScanResult): PackageInfo | null {
  const withFramework = result.monorepo.packages.filter((pkg) => pkg.framework !== null);
  if (withFramework.length > 0) {
    return withFramework[0] ?? null;
  }
  return result.monorepo.packages[0] ?? null;
}