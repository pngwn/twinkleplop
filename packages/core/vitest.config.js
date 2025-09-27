import { defineConfig } from "vitest/config";

export default defineConfig({
	define: {
		INTROSPECTION: true,
	},
	test: {
		environment: "node",
	},
});
