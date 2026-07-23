# Portus

A Docker scaffolding for Node.js projects. Portus scans your project, detects your package manager, runtime, and framework, and generates a production-ready `Dockerfile`, `.dockerignore`, and `docker-compose.yaml` tailored to what it finds.

## Installation

```bash
npm install -g portus
```

```bash
pnpm add -g portus
```

```bash
yarn global add portus
```

## Usage

Generate Docker configuration for the current project:

```bash
portus init
```

This scans the repository, prints what was detected, and writes a `Dockerfile`, `.dockerignore`, and `docker-compose.yaml`. If any of these files already exist, you will be prompted before they are overwritten.

Skip overwrite prompts (useful in CI or when re-running repeatedly):

```bash
portus init --yes
```

Preview what Portus detects without writing any files:

```bash
portus scan
```

Analyze an existing Docker setup for common issues:

```bash
portus doctor
```

`doctor` exits with a non-zero status code when errors are found, so it can be used as a CI check.

## Commands

| Command | Description |
| --- | --- |
| `portus init` | Scan the project and generate `Dockerfile`, `.dockerignore`, and `docker-compose.yaml` |
| `portus init -y, --yes` | Same as `init`, without overwrite confirmation prompts |
| `portus scan` | Report detected package manager, runtime, monorepo structure, and framework without writing files |
| `portus doctor` | Analyze existing Docker configuration and report issues |

## What gets detected

- **Package manager** — resolved from lockfiles (pnpm, yarn, bun, npm), defaulting to npm if none are found.
- **Runtime and version** — Node or Bun, with the Node version resolved from `engines.node`, `.nvmrc`, or `.node-version`, in that order.
- **Monorepo structure** — workspace packages resolved from `pnpm-workspace.yaml`, `package.json#workspaces`, or `lerna.json`. Turborepo and Nx are recognized as build orchestrators.
- **Framework** — classified per package from an ordered rule set, so meta-frameworks are correctly distinguished from the libraries underneath them.

## Framework support

Portus generates a tailored, production-optimized Dockerfile depending on the framework it detects:

**Next.js**
With `output: "standalone"` set in `next.config.*`, Portus builds a minimal runtime image from `.next/standalone`, with no `node_modules` in the final image at all. Without standalone output configured, it falls back to a production-dependency-only build.

**Nuxt**
Built from Nuxt's `.output` directory, which is self-contained by default.

**SvelteKit**
Branched by adapter, detected from `svelte.config.*`. `adapter-node` produces a Node-runnable image with production-only dependencies. `adapter-static` produces a static image served by nginx. Other adapters (Vercel, Netlify, Cloudflare, auto) fall back to a generic build.

**Remix**
Generic production build with a dedicated production-dependency stage.

**Express, Fastify, Koa, Hono, NestJS**
If a build script is present, a dedicated build stage compiles the project and only production dependencies are installed for the runtime image. Without a build step, only a production install runs, with no unnecessary dev-dependency stage.

**React, Vue, Svelte, Create React App, Angular, Astro**
Built and served as static assets from nginx, using each framework's known build output directory.

Every generated Node-based runtime image runs as a non-root user by default.

## Docker configuration output

**Dockerfile**
Multi-stage where applicable, with a parallel production-only dependency install stage swapped into the final image so development dependencies never ship to production. Base images are pinned to a specific version tag.

**.dockerignore**
A solid baseline (`node_modules`, `.git`, environment files, editor directories, logs) plus the detected framework's build output directory, so stale local build artifacts and generated files are never sent to the Docker build context.

**docker-compose.yaml**
A service definition with the correct build context, port mapping based on the detected framework's default port, a restart policy, and an `env_file` reference if a `.env` file is present.

## Doctor checks

`portus doctor` analyzes an existing Dockerfile, `.dockerignore`, and `docker-compose.yaml` for:

- Missing files
- Single-stage builds
- Unpinned or `:latest` base image tags
- Missing non-root `USER` instruction
- Dependency installs running after `COPY . .`, which defeats layer caching
- Possible hardcoded secrets in `ENV` or `ARG` instructions
- Missing `EXPOSE` instruction
- Missing recommended `.dockerignore` entries
- Invalid or incomplete `docker-compose.yaml` structure, including missing restart policies or port mappings

## License

MIT