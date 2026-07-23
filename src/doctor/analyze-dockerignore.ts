import { existsSync, readFileSync } from "node:fs";
import type { DoctorIssue, DoctorReport } from "./types.js";

const RECOMMENDED_ENTRIES = ["node_modules", ".git", ".env"];

export function analyzeDockerignore(dockerignorePath: string): DoctorReport {
  if (!existsSync(dockerignorePath)) {
    return {
      file: dockerignorePath,
      exists: false,
      issues: [
        {
          severity: "warning",
          message: "No .dockerignore found. The build context may include unnecessary or sensitive files.",
        },
      ],
    };
  }

  const content = readFileSync(dockerignorePath, "utf-8");
  const issues: DoctorIssue[] = [];

  for (const entry of RECOMMENDED_ENTRIES) {
    if (!content.includes(entry)) {
      issues.push({
        severity: "warning",
        message: `"${entry}" is not excluded in .dockerignore.`,
      });
    }
  }

  return { file: dockerignorePath, exists: true, issues };
}