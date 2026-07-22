export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface PackageInfo {
  name: string;
  path: string;
  packageJsonPath: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  isRoot: boolean;
}

export interface WorkspaceConfig {
  source: "pnpm-workspace.yaml" | "package.json" | "lerna.json" | null;
  patterns: string[];
  orchestrator: "turborepo" | "nx" | null;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  workspaceSource: WorkspaceConfig["source"];
  patterns: string[];
  orchestrator: WorkspaceConfig["orchestrator"];
  packages: PackageInfo[];
}

export interface ScanResult {
  root: string;
  packageManager: PackageManager;
  monorepo: MonorepoInfo;
}