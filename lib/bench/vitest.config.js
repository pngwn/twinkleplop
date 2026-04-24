import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		// Explicitly avoid the workspace "source" condition so benches hit
		// package dist exports (the same artifact users consume).
		conditions: ["import", "default"],
	},
	ssr: {
		resolve: {
			conditions: ["import", "default"],
		},
	},
	test: {
		include: ["**/*.bench.js"],
		benchmark: {
			outputJson: "./benchmark-results.json",
		},
	},
});
