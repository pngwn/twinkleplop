// shared types build for the lib packages that publish a bundle. every export
// with a `source` condition becomes a module declaration in dist/types.d.ts,
// from the same entry points package.vite.config.ts bundles.

import { readFileSync } from "node:fs";
import { createBundle } from "dts-buddy";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const modules = {};
for (const [subpath, condition] of Object.entries(pkg.exports ?? {})) {
  const source = typeof condition === "object" && condition !== null ? condition.source : undefined;
  if (!source) continue;
  modules[subpath === "." ? pkg.name : `${pkg.name}/${subpath.slice(2)}`] = source;
}

if (Object.keys(modules).length === 0) {
  throw new Error(`${pkg.name} has no exports with a \`source\` condition to declare`);
}

await createBundle({
  project: "tsconfig.json",
  output: "dist/types.d.ts",
  modules,
});
