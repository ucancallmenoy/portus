import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type SvelteKitAdapter = "node" | "static" | "auto" | "vercel" | "netlify" | "cloudflare" | "unknown";

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