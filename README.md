# Portus

> Intelligent Docker scaffolding for modern applications.

Portus is a CLI that analyzes your project and generates an optimized Docker setup. It detects your project's package manager, runtime, and framework, then produces a production-ready `Dockerfile` tailored to what it finds, instead of you writing one by hand for every project.

## Installation

```bash
pnpm install
```

## Development

Start the CLI in development mode:

```bash
pnpm dev
```

Build the project:

```bash
pnpm build
```

Run the compiled CLI:

```bash
pnpm start
```

## Usage

From inside a project (single repo or monorepo):

```bash
portus init
```

This scans the repository, prints a summary of what was detected, and writes a `Dockerfile` for the primary target package. If a `Dockerfile` already exists at that location, you will be asked to confirm before it is overwritten.

## What it detects

**Package manager** — resolved from lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `package-lock.json`), defaulting to npm if none are found.

**Runtime** — Node or Bun, with a Node version resolved from `engines.node` in `package.json`, then `.nvmrc`, then `.node-version`, falling back to a default LTS version if none are specified.

**Monorepo structure** — workspace packages are resolved from `pnpm-workspace.yaml`, `package.json#workspaces`, or `lerna.json`, in that priority order. Turborepo and Nx are recognized as build orchestrators layered on top of a workspace definition, not as workspace sources themselves.

**Framework** — each `package.json` found (root and, in a monorepo, every workspace package) is classified against an ordered set of rules, from most specific to least specific, so that meta-frameworks (Next.js, Nuxt, SvelteKit, Remix) are correctly distinguished from the underlying libraries they depend on (React, Vue, Svelte).

## Dockerfile generation

Generation branches by framework category:

- **Fullstack** (Next.js, Nuxt, SvelteKit, Remix) — multi-stage build tailored to the framework's actual output shape where that shape is reliably detectable:
  - Next.js with `output: "standalone"` set in `next.config.*` gets a minimal runtime image built from `.next/standalone`, with no `node_modules` copied at all.
  - Nuxt is built from its `.output` directory, which is self-contained by default.
  - SvelteKit is branched by adapter (detected from `svelte.config.*`): `adapter-node` produces a Node-runnable image, `adapter-static` produces an nginx-served static image. Other adapters (Vercel, Netlify, Cloudflare, auto) fall back to the generic path below, since their actual output targets a different runtime than a plain container.
  - Everything else in this category uses a generic path: the built app is copied forward, its development `node_modules` are removed, and a production-only `node_modules` (installed in a parallel stage) is copied in its place.

- **Backend** (Express, Fastify, Koa, Hono, NestJS) — if a `build` script exists, a dedicated build stage compiles the project and only production dependencies are installed for the runtime stage. If there is no build step, the dev-dependency install stage is skipped entirely and only a production install runs.

- **Frontend / static** (React, Vue, Svelte, Create React App, Angular, Astro) — built with the appropriate output directory per framework, then served from `nginx:alpine`. Angular's actual output path can vary by project name and version; this is a known limitation and may need manual adjustment.

Framework-specific output detectors (currently: Next.js standalone mode, SvelteKit adapter) live together in a single file rather than one file per framework, so that framework support does not read as favoring any one framework.


## Current status

Portus can scan a single repo or monorepo, detect package manager, runtime, and framework per package, and generate a working, reasonably optimized `Dockerfile` for the most common Node frameworks and backend setups.

## Roadmap

- [x] CLI foundation
- [x] Project detection (package manager, runtime, monorepo structure, framework)
- [x] Dockerfile generation
- [ ] `.dockerignore` generation
- [ ] `docker-compose.yml` generation
- [ ] Docker configuration analysis (`doctor`)
- [ ] Additional framework-specific optimizations (Remix adapter detection, Angular output path resolution)

## License

MIT