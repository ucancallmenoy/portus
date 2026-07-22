import type { FrameworkRule } from "../types.js";

export const FRAMEWORK_RULES: FrameworkRule[] = [
  { id: "nextjs", displayName: "Next.js", category: "fullstack", matchDependencies: ["next"], port: 3000 },
  { id: "nuxt", displayName: "Nuxt", category: "fullstack", matchDependencies: ["nuxt"], port: 3000 },
  { id: "sveltekit", displayName: "SvelteKit", category: "fullstack", matchDependencies: ["@sveltejs/kit"], port: 5173 },
  { id: "remix", displayName: "Remix", category: "fullstack", matchDependencies: ["@remix-run/react"], port: 3000 },
  { id: "astro", displayName: "Astro", category: "static", matchDependencies: ["astro"], port: 4321 },
  { id: "angular", displayName: "Angular", category: "frontend", matchDependencies: ["@angular/core"], port: 4200 },
  { id: "nestjs", displayName: "NestJS", category: "backend", matchDependencies: ["@nestjs/core"], port: 3000 },
  { id: "express", displayName: "Express", category: "backend", matchDependencies: ["express"], port: 3000 },
  { id: "fastify", displayName: "Fastify", category: "backend", matchDependencies: ["fastify"], port: 3000 },
  { id: "koa", displayName: "Koa", category: "backend", matchDependencies: ["koa"], port: 3000 },
  { id: "hono", displayName: "Hono", category: "backend", matchDependencies: ["hono"], port: 3000 },
  { id: "vite-vue", displayName: "Vue (Vite)", category: "frontend", matchDependencies: ["vue", "vite"], port: 5173 },
  { id: "vite-react", displayName: "React (Vite)", category: "frontend", matchDependencies: ["react", "vite"], port: 5173 },
  { id: "vite-svelte", displayName: "Svelte (Vite)", category: "frontend", matchDependencies: ["svelte", "vite"], port: 5173 },
  { id: "cra", displayName: "Create React App", category: "frontend", matchDependencies: ["react-scripts"], port: 3000 },
  { id: "vue-cli", displayName: "Vue", category: "frontend", matchDependencies: ["vue"], port: 8080 },
  { id: "react", displayName: "React", category: "frontend", matchDependencies: ["react"], port: 3000 },
  { id: "svelte", displayName: "Svelte", category: "frontend", matchDependencies: ["svelte"], port: 5000 },
];