import type { PackageInfo } from "../types.js";

const BASE_ENTRIES = [
  "node_modules",
  "npm-debug.log*",
  "yarn-debug.log*",
  "yarn-error.log*",
  "pnpm-debug.log*",
  ".git",
  ".gitignore",
  ".DS_Store",
  "*.log",
  ".env",
  ".env.*",
  "!.env.example",
  ".vscode",
  ".idea",
  "coverage",
  ".turbo",
  ".cache",
  "Dockerfile",
  ".dockerignore",
  "docker-compose*.yml",
  "docker-compose*.yaml",
];

const FRAMEWORK_OUTPUT_ENTRIES: Record<string, string[]> = {
  nextjs: [".next"],
  nuxt: [".output", ".nuxt"],
  sveltekit: [".svelte-kit", "build"],
  remix: ["build", "public/build"],
  astro: ["dist"],
  angular: ["dist"],
  "vite-react": ["dist"],
  "vite-vue": ["dist"],
  "vite-svelte": ["dist"],
  cra: ["build"],
  "vue-cli": ["dist"],
  react: ["dist"],
  svelte: ["dist"],
};

export function generateDockerignore(target: PackageInfo): string {
  const entries = new Set(BASE_ENTRIES);

  const frameworkId = target.framework?.id;
  if (frameworkId) {
    const frameworkEntries = FRAMEWORK_OUTPUT_ENTRIES[frameworkId] ?? [];
    for (const entry of frameworkEntries) {
      entries.add(entry);
    }
  }

  if ("build" in target.scripts) {
    entries.add("dist");
  }

  return `${Array.from(entries).join("\n")}\n`;
}