// shared build for the lib packages that publish a bundle. entry points are
// read from the `source` conditions of the package's own export map, so that
// map stays the single list of what a package exposes, and nothing outside
// the package is bundled: a dependency stays a dependency.

import { existsSync, readFileSync } from "node:fs";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { defineConfig } from "vite";

const cwd = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf8"));

const entry: Record<string, string> = {};
for (const [subpath, condition] of Object.entries(pkg.exports ?? {})) {
  const source =
    typeof condition === "object" && condition !== null
      ? (condition as Record<string, string>).source
      : undefined;
  if (!source) continue;
  const path = resolve(cwd, source);
  if (!existsSync(path)) {
    throw new Error(`${pkg.name} exports ${subpath} from ${source}, which does not exist`);
  }
  entry[basename(source, extname(source))] = path;
}

if (Object.keys(entry).length === 0) {
  throw new Error(`${pkg.name} has no exports with a \`source\` condition to build`);
}

export default defineConfig({
  build: {
    lib: {
      entry,
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      // everything bare is external. rollup hands this the specifier as
      // written, so relative ids are still relative here; absolute ones are
      // the entry files and vite's own virtual modules.
      external: (id) => !id.startsWith(".") && !id.startsWith("\0") && !isAbsolute(id),
      output: {
        dir: "dist",
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
