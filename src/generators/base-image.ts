import type { RuntimeInfo } from "../types.js";

export function getBaseImage(runtime: RuntimeInfo): string {
  if (runtime.runtime === "bun") {
    return "oven/bun:1-alpine";
  }
  return `node:${runtime.nodeVersion}-alpine`;
}