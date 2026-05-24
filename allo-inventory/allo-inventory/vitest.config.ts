import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Integration tests hit a real DB — run serially to avoid interference
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    setupFiles: ["__tests__/setup.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
})
