import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { font_style, theme_styles } from "@twinkleplop/core/types";
import { dark, dark_styles, light, light_styles } from "./tokens.ts";

const VAR_ONLY_KEYS = new Set(["background_color"]);
const INHERIT_KEYS = new Set(["space", "tab", "newline", "carriage_return"]);

const STYLE_PROPERTIES: Record<string, (style: readonly font_style[]) => string> = {
  "font-style": (style) => (style.includes("italic") ? "italic" : "normal"),
  "font-weight": (style) => (style.includes("bold") ? "bold" : "normal"),
  "text-decoration": (style) =>
    [style.includes("underline") && "underline", style.includes("strikethrough") && "line-through"]
      .filter(Boolean)
      .join(" ") || "none",
};

// a property gets a variable in every block when either variant sets it, so .dark can unset it
const styled_properties = (variants: theme_styles[]) => {
  const styled = new Map<string, string[]>();
  const keys = new Set(variants.flatMap((styles) => Object.keys(styles)));
  for (const key of keys) {
    const properties = Object.keys(STYLE_PROPERTIES).filter((property) =>
      variants.some(
        (styles) =>
          STYLE_PROPERTIES[property](styles[key] ?? []) !== STYLE_PROPERTIES[property]([]),
      ),
    );
    if (properties.length > 0) styled.set(key, properties);
  }
  return styled;
};

const styled = styled_properties([light_styles, dark_styles]);

const var_name = (key: string) => (key === "background_color" ? "background" : key);

const var_block = (selector: string, palette: Record<string, string>, styles: theme_styles) => {
  const colours = Object.entries(palette).map(([k, v]) => `\t--twp-${var_name(k)}: ${v};`);
  const style_vars = [...styled].flatMap(([key, properties]) =>
    properties.map(
      (property) => `\t--twp-${key}-${property}: ${STYLE_PROPERTIES[property](styles[key] ?? [])};`,
    ),
  );
  return `${selector} {\n${[...colours, ...style_vars].join("\n")}\n}\n`;
};

const binding_block = (palette: Record<string, string>) => {
  const lines: string[] = [];
  for (const key of Object.keys(palette)) {
    if (VAR_ONLY_KEYS.has(key)) continue;
    if (INHERIT_KEYS.has(key)) continue;
    if (palette[key] === "inherit") continue;
    const declarations = [
      `color: var(--twp-${key});`,
      ...(styled.get(key) ?? []).map((property) => `${property}: var(--twp-${key}-${property});`),
    ];
    lines.push(`.twinkleplop .${key} { ${declarations.join(" ")} }`);
  }
  lines.push(".twinkleplop .space { white-space: pre; }");
  lines.push(".twinkleplop .tab { white-space: pre; }");
  lines.push(".twinkleplop .newline { white-space: pre; }");
  return `${lines.join("\n")}\n`;
};

const HEADER = "/* @twinkleplop/theme-rose-pine - generated from src/tokens.ts, do not edit */\n\n";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");

mkdirSync(dist, { recursive: true });

const bindings = binding_block(light);

const light_vars = var_block(":root", light, light_styles);
const dark_vars = var_block(":root", dark, dark_styles);
const dark_class_vars = var_block(".dark", dark, dark_styles);

writeFileSync(resolve(dist, "light.css"), HEADER + light_vars + "\n" + bindings);
writeFileSync(resolve(dist, "dark.css"), HEADER + dark_vars + "\n" + bindings);
writeFileSync(
  resolve(dist, "index.css"),
  HEADER + light_vars + "\n" + dark_class_vars + "\n" + bindings,
);

// typescript 6 noUncheckedSideEffectImports rejects a bare stylesheet import that resolves to no types
for (const name of ["index", "light", "dark"]) {
  writeFileSync(resolve(dist, `${name}.d.ts`), "export {};\n");
}

// plain node cannot import the typescript source, so ./tokens resolves to this emitted copy
const object_literal = (object: Record<string, unknown>) => {
  const body = Object.entries(object)
    .map(([k, v]) => `\t${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join("\n");
  return `{\n${body}\n}`;
};

writeFileSync(
  resolve(dist, "tokens.js"),
  HEADER +
    [
      `export const light = ${object_literal(light)};`,
      `export const dark = ${object_literal(dark)};`,
      `export const light_styles = ${object_literal(light_styles)};`,
      `export const dark_styles = ${object_literal(dark_styles)};`,
    ].join("\n\n") +
    "\n",
);

writeFileSync(
  resolve(dist, "tokens.d.ts"),
  HEADER +
    "export type theme_palette = Record<string, string> & { background_color: string };\n" +
    'export type font_style = "italic" | "bold" | "underline" | "strikethrough";\n' +
    "export type theme_styles = Partial<Record<string, readonly font_style[]>>;\n\n" +
    "export declare const light: theme_palette;\nexport declare const dark: theme_palette;\n" +
    "export declare const light_styles: theme_styles;\nexport declare const dark_styles: theme_styles;\n",
);

console.log("wrote dist/{index,light,dark}.css, their .d.ts stubs, and dist/tokens.{js,d.ts}");
