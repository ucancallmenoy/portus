import { existsSync, readFileSync } from "node:fs";
import type { DoctorIssue, DoctorReport } from "./types.js";

const SECRET_KEY_PATTERN = /\b(PASSWORD|SECRET|API_KEY|TOKEN|PRIVATE_KEY)\b\s*=/i;

function collectStageNames(lines: string[]): Set<string> {
  const stageNames = new Set<string>();
  for (const line of lines) {
    const match = line.trim().match(/^FROM\s+\S+\s+AS\s+(\S+)/i);
    const name = match?.[1];
    if (name) {
      stageNames.add(name.toLowerCase());
    }
  }
  return stageNames;
}

export function analyzeDockerfile(dockerfilePath: string): DoctorReport {
  if (!existsSync(dockerfilePath)) {
    return {
      file: dockerfilePath,
      exists: false,
      issues: [{ severity: "error", message: "No Dockerfile found. Run `portus init` to generate one." }],
    };
  }

  const content = readFileSync(dockerfilePath, "utf-8");
  const lines = content.split("\n");
  const issues: DoctorIssue[] = [];

  const fromLines = lines.filter((line) => line.trim().toUpperCase().startsWith("FROM"));
  if (fromLines.length <= 1) {
    issues.push({
      severity: "warning",
      message: "Single-stage build detected. Consider a multi-stage build to keep the runtime image smaller.",
    });
  }

  const stageNames = collectStageNames(lines);

  for (const fromLine of fromLines) {
    const imageRef = fromLine.trim().split(/\s+/)[1] ?? "";
    if (stageNames.has(imageRef.toLowerCase())) {
      continue;
    }
    if (/:latest\b/.test(fromLine) || !imageRef.includes(":")) {
      issues.push({
        severity: "warning",
        message: `Base image "${fromLine.trim()}" is not pinned to a specific version tag.`,
      });
    }
  }

  const hasUser = lines.some((line) => line.trim().toUpperCase().startsWith("USER"));
  if (!hasUser) {
    issues.push({
      severity: "warning",
      message: "No USER instruction found. The container will run as root by default.",
    });
  }

  const copyAllIndex = lines.findIndex((line) => line.trim() === "COPY . .");
  const installIndex = lines.findIndex((line) =>
    /RUN\s+(npm|pnpm|yarn|bun)\s+(install|ci)/.test(line.trim()),
  );
  if (copyAllIndex !== -1 && installIndex !== -1 && copyAllIndex < installIndex) {
    issues.push({
      severity: "info",
      message: "Dependency install runs after `COPY . .`, which defeats Docker layer caching on source changes.",
    });
  }

  if (SECRET_KEY_PATTERN.test(content)) {
    issues.push({
      severity: "error",
      message: "Possible hardcoded secret detected in an ENV or ARG instruction.",
    });
  }

  const hasExpose = lines.some((line) => line.trim().toUpperCase().startsWith("EXPOSE"));
  if (!hasExpose) {
    issues.push({
      severity: "info",
      message: "No EXPOSE instruction found. Consider documenting the container's listening port.",
    });
  }

  return { file: dockerfilePath, exists: true, issues };
}