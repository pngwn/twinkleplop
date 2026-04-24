import { createBundle } from "dts-buddy";

await createBundle({
  project: "tsconfig.json",
  output: "dist/types.d.ts",
  modules: {
    "@twinkleplop/core": "src/index.ts",
    "@twinkleplop/core/debug": "src/index.ts",
    "@twinkleplop/core/compile": "src/compiler_index.ts",
    "@twinkleplop/core/introspector": "src/introspector.ts",
    "@twinkleplop/core/grammar-mapper": "src/grammar-mapper.ts",
    "@twinkleplop/core/types": "src/types.ts",
  },
});
