export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export type Runtime = "node" | "bun";

export type RuntimeSource = "engines" | "nvmrc" | "node-version" | "default";

export interface RuntimeInfo {
  runtime: Runtime;
  nodeVersion: string;
  source: RuntimeSource;
}

export type FrameworkCategory = "frontend" | "backend" | "fullstack" | "static";

export interface FrameworkRule {
  id: string;
  displayName: string;
  category: FrameworkCategory;
  matchDependencies: string[];
  port?: number;
  buildOutputDir?: string;
}

export interface FrameworkMatch {
  id: string;
  displayName: string;
  category: FrameworkCategory;
  port?: number;
  buildOutputDir?: string;
}

export interface PackageInfo {
  name: string;
  path: string;
  packageJsonPath: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  isRoot: boolean;
  framework: FrameworkMatch | null;
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
  runtime: RuntimeInfo;
  monorepo: MonorepoInfo;
}