import type { PackageInfo, PackageManager, RuntimeInfo } from "../types.js";
import { getPackageManagerCommands } from "./package-manager-commands.js";
import { getBaseImage } from "./base-image.js";
import { detectNextStandalone, detectSvelteKitAdapter } from "./detectors/detect-framework-output.js";

export interface DockerfileOptions {
  packageManager: PackageManager;
  runtime: RuntimeInfo;
  target: PackageInfo;
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
    "COPY --from=builder /app/.output ./.output",
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
    "COPY --from=prod-deps /app/node_modules ./node_modules",
    "COPY --from=builder /app/build ./build",
    "COPY --from=builder /app/package.json ./package.json",
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

function generateFullstackDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;

  if (target.framework && target.framework.id === "nextjs" && detectNextStandalone(target.path)) {
    return generateNextStandaloneDockerfile(options);
  }

  if (target.framework && target.framework.id === "nuxt") {
    return generateNuxtDockerfile(options);
  }

  if (target.framework && target.framework.id === "sveltekit") {
    const adapter = detectSvelteKitAdapter(target.path);
    if (adapter === "node") {
      return generateSvelteKitNodeDockerfile(options);
    }
    if (adapter === "static") {
      return generateSvelteKitStaticDockerfile(options);
    }
  }

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
    "COPY --from=builder /app ./",
    "RUN rm -rf node_modules",
    "COPY --from=prod-deps /app/node_modules ./node_modules",
    `EXPOSE ${port}`,
    `CMD ["${packageManager}", "run", "${startScript}"]`,
    "",
  ].join("\n");
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
      "COPY --from=prod-deps /app/node_modules ./node_modules",
      "COPY --from=builder /app/dist ./dist",
      "COPY package.json ./",
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
      "COPY --from=prod-deps /app/node_modules ./node_modules",
      "COPY . .",
      `EXPOSE ${port}`,
      hasScript(target, "start")
        ? `CMD ["${packageManager}", "run", "start"]`
        : `CMD ["node", "index.js"]`,
      "",
    );
  }

  return lines.join("\n");
}

function generateStaticDockerfile(options: DockerfileOptions): string {
  const { packageManager, runtime, target } = options;
  const baseImage = getBaseImage(runtime);
  const commands = getPackageManagerCommands(packageManager);
  const outputDir = target.framework?.buildOutputDir ?? "dist";

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
    `COPY --from=builder /app/${outputDir} /usr/share/nginx/html`,
    "EXPOSE 80",
    'CMD ["nginx", "-g", "daemon off;"]',
    "",
  ].join("\n");
}

export function generateDockerfile(options: DockerfileOptions): string {
  const category = options.target.framework?.category ?? "backend";

  switch (category) {
    case "fullstack":
      return generateFullstackDockerfile(options);
    case "frontend":
    case "static":
      return generateStaticDockerfile(options);
    case "backend":
    default:
      return generateBackendDockerfile(options);
  }
}