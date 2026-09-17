// the `twoslash` template tag for docs snippets. it never runs: the
// `docs-twoslash` vite plugin (twoslash_plugin.ts) type checks each tagged
// snippet at build time and replaces it with the rendered html string.
// reaching this function means the plugin did not see the file.

export function twoslash(_strings: TemplateStringsArray): string {
  throw new Error("twoslash snippets are compiled by the docs-twoslash vite plugin");
}
