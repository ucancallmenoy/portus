import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PackageManager } from "../types.js";

const LOCKFILES: Record<string, PackageManager> = {
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "package-lock.json": "npm",
};

export function detectPackageManager(rootDir: string): PackageManager {
  for (const [lockfile, manager] of Object.entries(LOCKFILES)) {
    if (existsSync(join(rootDir, lockfile))) {
      return manager;
    }
  }
  return "npm";
}