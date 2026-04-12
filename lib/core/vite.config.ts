import { defineConfig } from "vite";
import { resolve } from "path";
import terser from "@rollup/plugin-terser";
// Note: terser disabled for build stability in constrained envs

export default defineConfig(({ mode }) => {
	const isDebug = mode === "debug";
	return {
		define: {
			INTROSPECTION: isDebug,
		},
		build: {
			lib: {
				entry: [
					resolve(__dirname, "src/index.ts"),
					resolve(__dirname, "src/compiler_index.ts"),
					resolve(__dirname, "src/introspector.ts"),
          resolve(__dirname, "src/grammar-mapper.ts"),
					resolve(__dirname, "src/tokens.ts"),
				],
				name: "Twinkleplop",
				fileName: (format, entryName) => {
					switch (entryName) {
						case "index":
							return `twinkleplop.${isDebug ? "debug" : "production"}.js`;
						case "compiler_index":
							return `twinkleplop.compiler.js`;
						case "introspector":
							return `twinkleplop.introspector.js`;
						case "grammar-mapper":
							return `twinkleplop.grammar-mapper.js`;
						case "tokens":
							return `twinkleplop.tokens.js`;
						default:
							return `twinkleplop.${format}.${isDebug ? "debug" : "production"}.js`;
					}
				},
				formats: ["es"],
			},

			rollupOptions: {
				external: [],
				output: {
					dir: "dist",
				},
				plugins: [
					// Apply terser only for production builds; debug stays readable and
					// avoids plugin async issues in constrained environments.
					!isDebug &&
						terser({
							compress: {
								// drop_console: true,
								ecma: 2020,
								module: true,
								passes: 5,
								pure_getters: true,
								toplevel: true,
							},
							mangle: {
								module: true,
							},
						}),
				].filter(Boolean),
			},
			sourcemap: true,
			emptyOutDir: false,
		},
	};
});
