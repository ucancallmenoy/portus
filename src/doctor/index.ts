import { join } from "node:path";
import { scanRepo } from "../scanner/index.js";
import { selectPrimaryTarget } from "../generators/select-target.js";
import { analyzeDockerfile } from "./analyze-dockerfile.js";
import { analyzeDockerignore } from "./analyze-dockerignore.js";
import { analyzeDockerCompose } from "./analyze-docker-compose.js";
import type { DoctorReport } from "./types.js";

export async function runDoctor(rootDir: string): Promise<DoctorReport[]> {
  const result = await scanRepo(rootDir);
  const target = selectPrimaryTarget(result);
  const targetPath = target?.path ?? rootDir;

  return [
    analyzeDockerfile(join(targetPath, "Dockerfile")),
    analyzeDockerignore(join(targetPath, ".dockerignore")),
    analyzeDockerCompose(join(rootDir, "docker-compose.yaml")),
  ];
}