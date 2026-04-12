import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.bench.js"],
    benchmark: {
      outputJson: "./benchmark-results.json",
    },
    // Reduce worker complexity in constrained environments
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
  },
});
