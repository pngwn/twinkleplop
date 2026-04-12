import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.bench.js"],
    benchmark: {
      outputJson: "./benchmark-results.json",
    },
  },
});
