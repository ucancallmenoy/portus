import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import type { DoctorIssue, DoctorReport } from "./types.js";

export function analyzeDockerCompose(composePath: string): DoctorReport {
  if (!existsSync(composePath)) {
    return {
      file: composePath,
      exists: false,
      issues: [{ severity: "info", message: "No docker-compose.yaml found. Run `portus init` to generate one." }],
    };
  }

  const content = readFileSync(composePath, "utf-8");
  const issues: DoctorIssue[] = [];

  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch {
    issues.push({ severity: "error", message: "docker-compose.yaml could not be parsed as valid YAML." });
    return { file: composePath, exists: true, issues };
  }

  if (!parsed || typeof parsed !== "object" || !("services" in parsed)) {
    issues.push({ severity: "error", message: "docker-compose.yaml has no top-level services section." });
    return { file: composePath, exists: true, issues };
  }

  const services = (parsed as { services?: Record<string, unknown> }).services ?? {};
  for (const [name, service] of Object.entries(services)) {
    if (!service || typeof service !== "object") {
      continue;
    }
    if (!("restart" in service)) {
      issues.push({ severity: "info", message: `Service "${name}" has no restart policy set.` });
    }
    if (!("ports" in service) && !("expose" in service)) {
      issues.push({ severity: "info", message: `Service "${name}" does not expose or map any ports.` });
    }
  }

  return { file: composePath, exists: true, issues };
}