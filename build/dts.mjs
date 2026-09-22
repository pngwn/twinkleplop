// shared types build for the lib packages that publish a bundle. every export
// with a `source` condition becomes a module declaration in dist/types.d.ts,
// from the same entry points package.vite.config.ts bundles.

import { readFileSync, rmSync, writeFileSync } from "node:fs";
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

const output = "dist/types.d.ts";

await createBundle({
  project: "tsconfig.json",
  output,
  modules,
});

// `export { fn as "function" }` (arbitrary module namespace names, used by
// core/tokens for reserved words) comes back out of dts-buddy flattened to
// `export const "function" = "function";`, which is not parseable TypeScript —
// and a parse error in a .d.ts cannot be suppressed with `skipLibCheck`, so it
// breaks compilation for every consumer. Declare a legal local identifier and
// re-export it under the required name instead.
const declared = readFileSync(output, "utf8");
let counter = 0;
let repaired = declared.replace(
  /^([ \t]*)export const "((?:[^"\\]|\\.)*)"\s*=\s*([^;]+);$/gm,
  (_match, indent, name, value) => {
    const local = `__reserved_${name.replace(/[^A-Za-z0-9_$]/g, "_")}_${counter++}`;
    return `${indent}const ${local}: ${value};\n${indent}export { ${local} as "${name}" };`;
  },
);

// dts-buddy emits every declared module as a self-contained block, so a class
// reachable from more than one entry point is inlined once per block. TypeScript
// compares classes with `private` members nominally, so those copies are
// mutually unassignable: passing `TokenizerIntrospector` from `/introspector` to
// `tokenize` from `/debug` is TS2345 even though it is the same class at
// runtime. Private members carry no information a consumer can use — the
// signature is already elided to a bare `private name;` — so dropping them
// leaves one structural shape that unifies across the blocks.
const privates = /^[ \t]*private\s+(?:static\s+)?(?:readonly\s+)?[A-Za-z_$#][\w$]*;[ \t]*\r?\n/gm;
const private_count = (repaired.match(privates) ?? []).length;
repaired = repaired.replace(privates, "");

if (/^[ \t]*(?:private|protected)\b/m.test(repaired)) {
  // a form this pass does not understand (a parameter property, a `protected`
  // member) would re-introduce nominal identity without being stripped.
  throw new Error(
    `${pkg.name}: unrecognised private/protected member survived declaration flattening`,
  );
}

// the declaration map points into src which is not published
repaired = repaired.replace(/\n*\/\/# sourceMappingURL=\S+\s*$/, "\n");
rmSync(`${output}.map`, { force: true });

if (repaired !== declared) writeFileSync(output, repaired);

console.log(
  `${pkg.name}: ${Object.keys(modules).length} modules declared` +
    `, ${counter} reserved-word export(s) repaired, ${private_count} private member(s) elided`,
);
