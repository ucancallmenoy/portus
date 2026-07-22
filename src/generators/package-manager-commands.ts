import type { PackageManager } from "../types.js";

export interface PackageManagerCommands {
  installFrozen: string;
  installProd: string;
  run: (script: string) => string;
  lockfile: string;
}

const COMMANDS: Record<PackageManager, PackageManagerCommands> = {
  pnpm: {
    installFrozen: "pnpm install --frozen-lockfile",
    installProd: "pnpm install --frozen-lockfile --prod",
    run: (script) => `pnpm run ${script}`,
    lockfile: "pnpm-lock.yaml",
  },
  npm: {
    installFrozen: "npm ci",
    installProd: "npm ci --omit=dev",
    run: (script) => `npm run ${script}`,
    lockfile: "package-lock.json",
  },
  yarn: {
    installFrozen: "yarn install --frozen-lockfile",
    installProd: "yarn install --frozen-lockfile --production",
    run: (script) => `yarn ${script}`,
    lockfile: "yarn.lock",
  },
  bun: {
    installFrozen: "bun install --frozen-lockfile",
    installProd: "bun install --frozen-lockfile --production",
    run: (script) => `bun run ${script}`,
    lockfile: "bun.lockb",
  },
};

export function getPackageManagerCommands(packageManager: PackageManager): PackageManagerCommands {
  return COMMANDS[packageManager];
}