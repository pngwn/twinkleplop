import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    INTROSPECTION: true,
  },
  resolve: {
    conditions: ["source"],
  },
  ssr: {
    resolve: {
      conditions: ["source"],
    },
  },
  test: {
    environment: "node",
  },
});
