import { defineConfig } from "vitest/config";
import vitest_config from "./vitest.config";

export default defineConfig({
	define: {
		INTROSPECTION: true,
	},
	test: {
		globals: true,
		environment: "node",
	},
});
