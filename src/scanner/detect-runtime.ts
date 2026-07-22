import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageManager, RuntimeInfo } from "../types.js";

const DEFAULT_NODE_VERSION = "22";

function parseMajorVersion(raw: string): string | null {
  const cleaned = raw.trim().replace(/^v/, "");
  const match = cleaned.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const group = match[1];
  return group ?? null;
}

function readVersionFile(rootDir: string, filename: string): string | null {
  const filePath = join(rootDir, filename);
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath, "utf-8");
  return parseMajorVersion(content);
}

export function detectRuntime(
  rootDir: string,
  rootPackageJson: Record<string, unknown>,
  packageManager: PackageManager,
): RuntimeInfo {
  if (packageManager === "bun") {
    return { runtime: "bun", nodeVersion: DEFAULT_NODE_VERSION, source: "default" };
  }

  const engines = rootPackageJson.engines;
  if (engines && typeof engines === "object" && "node" in engines) {
    const engineNode = (engines as { node?: string }).node;
    if (engineNode) {
      const version = parseMajorVersion(engineNode);
      if (version) {
        return { runtime: "node", nodeVersion: version, source: "engines" };
      }
    }
  }

  const nvmrcVersion = readVersionFile(rootDir, ".nvmrc");
  if (nvmrcVersion) {
    return { runtime: "node", nodeVersion: nvmrcVersion, source: "nvmrc" };
  }

  const nodeVersionFile = readVersionFile(rootDir, ".node-version");
  if (nodeVersionFile) {
    return { runtime: "node", nodeVersion: nodeVersionFile, source: "node-version" };
  }

  return { runtime: "node", nodeVersion: DEFAULT_NODE_VERSION, source: "default" };
}