import { defineConfig } from "vite";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const cwd = process.cwd();
const entry = existsSync(resolve(cwd, "src/index.ts"))
	? resolve(cwd, "src/index.ts")
	: resolve(cwd, "src/index.js");

export default defineConfig({
	build: {
		lib: {
			entry: [entry],
			formats: ["es"],
			fileName: "index",
		},
		rollupOptions: {
			external: [/^@twinkleplop\//],
			output: {
				dir: "dist",
			},
		},
		sourcemap: true,
		emptyOutDir: true,
	},
});
