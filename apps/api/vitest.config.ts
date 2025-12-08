import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Only run tests from src directory, exclude dist
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "**/*.config.*"],
    // Run tests sequentially to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Ensure test isolation
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.*",
        "**/index.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@medbook/types": path.resolve(__dirname, "../../packages/types/src"),
      "@app/db": path.resolve(__dirname, "../../packages/db/src"),
    },
  },
});
