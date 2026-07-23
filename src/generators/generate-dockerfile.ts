import type { PackageInfo, PackageManager, RuntimeInfo } from "../types.js";
import { getPackageManagerCommands } from "./package-manager-commands.js";
import { getBaseImage } from "./base-image.js";
import {
  detectNextStandalone,
  detectSvelteKitAdapter,
  detectRemixAdapter,
  detectAngularOutputDir,
} from "./detectors/detect-framework-output.js";

export interface DockerfileOptions {
  packageManager: PackageManager;
  runtime: RuntimeInfo;
  target: PackageInfo;
}

export interface DockerfileResult {
  content: string;
  warnings: string[];
}

function hasScript(target: PackageInfo, script: string): boolean {
  return script in target.scripts;
}

function corepackLines(packageManager: PackageManager): string[] {
  if (packageManager === "pnpm" || packageManager === "yarn") {
    return ["RUN corepack enable"];
  }
  return [];
}

function nonRootUserLines(): string[] {
  return ["RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser"];
}

function lockfileGlob(packageManager: PackageManager): string {
  return getPackageManagerCommands(packageManager).lockfile;
}

function depsStages(packageManager: PackageManager): string[] {
  const commands = getPackageManagerCommands(packageManager);
  return [
    "FROM base AS deps",
    "WORKDIR /app",
    `COPY package.json ${lockfileGlob(packageManager)} ./`,
    `RUN ${commands.installFrozen}`,
    "",
    "FROM base AS prod-deps",
    "WORKDIR /app",
    `COPY package.json ${lockfileGlob(packageManager)} ./`,
    `RUN ${commands.installProd}`,
    "",
  ];
}

function generateNextStandaloneDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const port = target.framework?.port ?? 3000;

  return [
    `FROM ${baseImage} AS base`,
    ...corepackLines(packageManager),
    "",
    "FROM base AS deps",
    "WORKDIR /app",
    `COPY package.json ${lockfileGlob(packageManager)} ./`,
    `RUN ${commands.installFrozen}`,
    "",
    "FROM base AS builder",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    `RUN ${commands.run("build")}`,
    "",
    "FROM base AS runner",
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    "RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs",
    "COPY --from=builder /app/public ./public",
    "COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./",
    "COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static",
    "USER nextjs",
    `EXPOSE ${port}`,
    'CMD ["node", "server.js"]',
    "",
  ].join("\n");
}

function generateNuxtDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const port = target.framework?.port ?? 3000;

  return [
    `FROM ${baseImage} AS base`,
    ...corepackLines(packageManager),
    "",
    "FROM base AS deps",
    "WORKDIR /app",
    `COPY package.json ${lockfileGlob(packageManager)} ./`,
    `RUN ${commands.installFrozen}`,
    "",
    "FROM base AS builder",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    `RUN ${commands.run("build")}`,
    "",
    "FROM base AS runner",
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    ...nonRootUserLines(),
    "COPY --from=builder --chown=appuser:nodejs /app/.output ./.output",
    "USER appuser",
    `EXPOSE ${port}`,
    'CMD ["node", ".output/server/index.mjs"]',
    "",
  ].join("\n");
}

function generateSvelteKitNodeDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const port = target.framework?.port ?? 3000;

  return [
    `FROM ${baseImage} AS base`,
    ...corepackLines(packageManager),
    "",
    ...depsStages(packageManager),
    "FROM base AS builder",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    `RUN ${commands.run("build")}`,
    "",
    "FROM base AS runner",
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    ...nonRootUserLines(),
    "COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules",
    "COPY --from=builder --chown=appuser:nodejs /app/build ./build",
    "COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json",
    "USER appuser",
    `EXPOSE ${port}`,
    'CMD ["node", "build/index.js"]',
    "",
  ].join("\n");
}

function generateSvelteKitStaticDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);

  return [
    `FROM ${baseImage} AS builder`,
    ...corepackLines(packageManager),
    "WORKDIR /app",
    `COPY package.json ${lockfileGlob(packageManager)} ./`,
    `RUN ${commands.installFrozen}`,
    "COPY . .",
    `RUN ${commands.run("build")}`,
    "",
    "FROM nginx:alpine AS runner",
    "COPY --from=builder /app/build /usr/share/nginx/html",
    "EXPOSE 80",
    'CMD ["nginx", "-g", "daemon off;"]',
    "",
  ].join("\n");
}

function generateGenericFullstackDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const port = target.framework?.port ?? 3000;
  const startScript = hasScript(target, "start") ? "start" : "dev";

  return [
    `FROM ${baseImage} AS base`,
    ...corepackLines(packageManager),
    "",
    ...depsStages(packageManager),
    "FROM base AS builder",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    `RUN ${commands.run("build")}`,
    "",
    "FROM base AS runner",
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    ...nonRootUserLines(),
    "COPY --from=builder --chown=appuser:nodejs /app ./",
    "RUN rm -rf node_modules",
    "COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules",
    "USER appuser",
    `EXPOSE ${port}`,
    `CMD ["${packageManager}", "run", "${startScript}"]`,
    "",
  ].join("\n");
}

function generateFullstackDockerfile(options: DockerfileOptions): { content: string; warnings: string[] } {
  const { target } = options;
  const warnings: string[] = [];

  if (target.framework && target.framework.id === "nextjs" && detectNextStandalone(target.path)) {
    return { content: generateNextStandaloneDockerfile(options), warnings };
  }

  if (target.framework && target.framework.id === "nuxt") {
    return { content: generateNuxtDockerfile(options), warnings };
  }

  if (target.framework && target.framework.id === "sveltekit") {
    const adapter = detectSvelteKitAdapter(target.path);
    if (adapter === "node") {
      return { content: generateSvelteKitNodeDockerfile(options), warnings };
    }
    if (adapter === "static") {
      return { content: generateSvelteKitStaticDockerfile(options), warnings };
    }
    warnings.push(
      `SvelteKit adapter "${adapter}" was detected. This does not produce a plain Node-runnable server, so the generated Dockerfile uses a generic Node build and may not run correctly. Consider @sveltejs/adapter-node for containerized deployments.`,
    );
    return { content: generateGenericFullstackDockerfile(options), warnings };
  }

  if (target.framework && target.framework.id === "remix") {
    const adapter = detectRemixAdapter(target);
    if (adapter === "vercel" || adapter === "cloudflare" || adapter === "deno") {
      warnings.push(
        `Remix adapter "${adapter}" targets a non-Node runtime or platform. The generated Dockerfile assumes a Node server and will likely not work as-is for this deployment target.`,
      );
    }
    return { content: generateGenericFullstackDockerfile(options), warnings };
  }

  return { content: generateGenericFullstackDockerfile(options), warnings };
}

function generateBackendDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const port = target.framework?.port ?? 3000;
  const buildable = hasScript(target, "build");

  const lines = [`FROM ${baseImage} AS base`, ...corepackLines(packageManager), ""];

  if (buildable) {
    lines.push(
      ...depsStages(packageManager),
      "FROM base AS builder",
      "WORKDIR /app",
      "COPY --from=deps /app/node_modules ./node_modules",
      "COPY . .",
      `RUN ${commands.run("build")}`,
      "",
      "FROM base AS runner",
      "WORKDIR /app",
      "ENV NODE_ENV=production",
      ...nonRootUserLines(),
      "COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules",
      "COPY --from=builder --chown=appuser:nodejs /app/dist ./dist",
      "COPY --chown=appuser:nodejs package.json ./",
      "USER appuser",
      `EXPOSE ${port}`,
      `CMD ["${packageManager}", "run", "start"]`,
      "",
    );
  } else {
    lines.push(
      "FROM base AS prod-deps",
      "WORKDIR /app",
      `COPY package.json ${lockfileGlob(packageManager)} ./`,
      `RUN ${commands.installProd}`,
      "",
      "FROM base AS runner",
      "WORKDIR /app",
      "ENV NODE_ENV=production",
      ...nonRootUserLines(),
      "COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules",
      "COPY --chown=appuser:nodejs . .",
      "USER appuser",
      `EXPOSE ${port}`,
      hasScript(target, "start")
        ? `CMD ["${packageManager}", "run", "start"]`
        : `CMD ["node", "index.js"]`,
      "",
    );
  }

  return lines.join("\n");
}

function generateStaticDockerfile(options: DockerfileOptions): { content: string; warnings: string[] } {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const warnings: string[] = [];

  let outputDir = target.framework?.buildOutputDir ?? "dist";

  if (target.framework?.id === "angular") {
    const angularOutputDir = detectAngularOutputDir(target.path);
    if (angularOutputDir) {
      outputDir = angularOutputDir;
    } else {
      warnings.push(
        `Could not read angular.json to determine the build output path. Assuming "${outputDir}" — verify this matches your project's actual output directory.`,
      );
    }
  }

  const content = [
    `FROM ${baseImage} AS builder`,
    ...corepackLines(packageManager),
    "WORKDIR /app",
    `COPY package.json ${lockfileGlob(packageManager)} ./`,
    `RUN ${commands.installFrozen}`,
    "COPY . .",
    `RUN ${commands.run("build")}`,
    "",
    "FROM nginx:alpine AS runner",
    `COPY --from=builder /app/${outputDir} /usr/share/nginx/html`,
    "EXPOSE 80",
    'CMD ["nginx", "-g", "daemon off;"]',
    "",
  ].join("\n");

  return { content, warnings };
}

export function generateDockerfile(options: DockerfileOptions): DockerfileResult {
  const category = options.target.framework?.category ?? "backend";

  switch (category) {
    case "fullstack":
      return generateFullstackDockerfile(options);
    case "frontend":
    case "static":
      return generateStaticDockerfile(options);
    case "backend":
    default:
      return { content: generateBackendDockerfile(options), warnings: [] };
  }
}