import { defineConfig } from "vitest/config";

export default defineConfig({
	define: {
		INTROSPECTION: true,
	},
	resolve: {
		conditions: ["source"],
	},
	test: {
		environment: "node",
	},
});
