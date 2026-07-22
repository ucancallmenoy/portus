import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import fs from "fs-extra";
import type { WorkspaceConfig } from "../types.js";

function detectOrchestrator(rootDir: string): WorkspaceConfig["orchestrator"] {
  if (existsSync(join(rootDir, "turbo.json"))) return "turborepo";
  if (existsSync(join(rootDir, "nx.json"))) return "nx";
  return null;
}

export function detectWorkspaces(
  rootDir: string,
  rootPackageJson: Record<string, unknown>,
): WorkspaceConfig {
  const orchestrator = detectOrchestrator(rootDir);

  const pnpmWorkspacePath = join(rootDir, "pnpm-workspace.yaml");
  if (existsSync(pnpmWorkspacePath)) {
    const content = parseYaml(readFileSync(pnpmWorkspacePath, "utf-8")) as {
      packages?: string[];
    };
    return { source: "pnpm-workspace.yaml", patterns: content.packages ?? [], orchestrator };
  }

  const workspacesField = rootPackageJson.workspaces;
  if (Array.isArray(workspacesField)) {
    return { source: "package.json", patterns: workspacesField, orchestrator };
  }
  if (workspacesField && typeof workspacesField === "object" && "packages" in workspacesField) {
    const packages = (workspacesField as { packages?: string[] }).packages;
    return { source: "package.json", patterns: packages ?? [], orchestrator };
  }

  const lernaPath = join(rootDir, "lerna.json");
  if (existsSync(lernaPath)) {
    const lerna = fs.readJsonSync(lernaPath) as { packages?: string[] };
    return { source: "lerna.json", patterns: lerna.packages ?? ["packages/*"], orchestrator };
  }

  return { source: null, patterns: [], orchestrator };
}