import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { stringify } from "yaml";
import type { PackageInfo, ScanResult } from "../types.js";

function toServiceName(pkg: PackageInfo): string {
  return pkg.name
    .replace(/^@[^/]+\//, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .toLowerCase();
}

export function generateDockerCompose(result: ScanResult, target: PackageInfo): string {
  const serviceName = toServiceName(target);
  const contextPath = relative(result.root, target.path) || ".";
  const port = target.framework?.port ?? 3000;
  const hasEnvFile = existsSync(join(target.path, ".env"));

  const service: Record<string, unknown> = {
    build: {
      context: contextPath,
      dockerfile: "Dockerfile",
    },
    ports: [`${port}:${port}`],
    environment: {
      NODE_ENV: "production",
    },
    restart: "unless-stopped",
  };

  if (hasEnvFile) {
    service.env_file = [join(contextPath, ".env")];
  }

  const compose = {
    services: {
      [serviceName]: service,
    },
  };

  return stringify(compose);
}