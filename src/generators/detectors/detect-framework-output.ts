import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageInfo } from "../../types.js";

export type SvelteKitAdapter = "node" | "static" | "auto" | "vercel" | "netlify" | "cloudflare" | "unknown";
export type RemixAdapter = "node" | "vercel" | "cloudflare" | "deno" | "unknown";

function readConfigContent(targetPath: string, filenames: string[]): string | null {
  for (const filename of filenames) {
    const filePath = join(targetPath, filename);
    if (existsSync(filePath)) {
      return readFileSync(filePath, "utf-8");
    }
  }
  return null;
}

const NEXT_CONFIG_FILENAMES = ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"];

export function detectNextStandalone(targetPath: string): boolean {
  const content = readConfigContent(targetPath, NEXT_CONFIG_FILENAMES);
  if (!content) {
    return false;
  }
  return /output\s*:\s*["']standalone["']/.test(content);
}

const SVELTEKIT_CONFIG_FILENAMES = ["svelte.config.js", "svelte.config.mjs", "svelte.config.cjs"];

const SVELTEKIT_ADAPTER_PATTERNS: Array<[SvelteKitAdapter, RegExp]> = [
  ["node", /@sveltejs\/adapter-node/],
  ["static", /@sveltejs\/adapter-static/],
  ["vercel", /@sveltejs\/adapter-vercel/],
  ["netlify", /@sveltejs\/adapter-netlify/],
  ["cloudflare", /@sveltejs\/adapter-cloudflare/],
  ["auto", /@sveltejs\/adapter-auto/],
];

export function detectSvelteKitAdapter(targetPath: string): SvelteKitAdapter {
  const content = readConfigContent(targetPath, SVELTEKIT_CONFIG_FILENAMES);
  if (!content) {
    return "unknown";
  }
  for (const [adapter, pattern] of SVELTEKIT_ADAPTER_PATTERNS) {
    if (pattern.test(content)) {
      return adapter;
    }
  }
  return "unknown";
}

const REMIX_ADAPTER_PACKAGES: Array<[RemixAdapter, string]> = [
  ["vercel", "@remix-run/vercel"],
  ["cloudflare", "@remix-run/cloudflare-pages"],
  ["cloudflare", "@remix-run/cloudflare"],
  ["deno", "@remix-run/deno"],
  ["node", "@remix-run/serve"],
];

function hasDependency(target: PackageInfo, name: string): boolean {
  return name in target.dependencies || name in target.devDependencies;
}

export function detectRemixAdapter(target: PackageInfo): RemixAdapter {
  for (const [adapter, packageName] of REMIX_ADAPTER_PACKAGES) {
    if (hasDependency(target, packageName)) {
      return adapter;
    }
  }
  return "unknown";
}

interface AngularProjectConfig {
  architect?: {
    build?: {
      options?: {
        outputPath?: string | { base?: string };
      };
    };
  };
}

interface AngularJson {
  defaultProject?: string;
  projects?: Record<string, AngularProjectConfig>;
}

export function detectAngularOutputDir(targetPath: string): string | null {
  const angularJsonPath = join(targetPath, "angular.json");
  if (!existsSync(angularJsonPath)) {
    return null;
  }

  let angularJson: AngularJson;
  try {
    angularJson = JSON.parse(readFileSync(angularJsonPath, "utf-8")) as AngularJson;
  } catch {
    return null;
  }

  const projects = angularJson.projects ?? {};
  const projectNames = Object.keys(projects);
  if (projectNames.length === 0) {
    return null;
  }

  const projectName = angularJson.defaultProject ?? projectNames[0];
  const project = projectName ? projects[projectName] : undefined;
  const outputPath = project?.architect?.build?.options?.outputPath;

  if (!outputPath) {
    return null;
  }

  if (typeof outputPath === "string") {
    return outputPath;
  }

  if (outputPath.base) {
    return `${outputPath.base}/browser`;
  }

  return null;
}