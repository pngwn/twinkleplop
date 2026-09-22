// decodes an /explore/edit link, printing the snippet or saving it as a fixture
//
//   node lib/_site/scripts/share_to_fixture.mjs '<link>'          settings to stderr, source to stdout
//   node lib/_site/scripts/share_to_fixture.mjs '<link>' <name>   writes languages/<lang>/test/<name>.<ext>
//
// the node twin of src/lib/explore/share.ts

import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const languages_dir = join(root, "languages");

/**
 * @typedef {{ lang: string, source: string, theme: string | null, fidelity: string[] | null }} share_state
 */

/**
 * the state in a link or its hash, null when it is not a share link
 * @param {string} link
 * @returns {share_state | null}
 */
export function decode_share(link) {
  const params = new URLSearchParams(link.slice(link.indexOf("#") + 1));
  const lang = params.get("lang");
  const code = params.get("code");
  if (params.get("v") !== "1" || !lang || code === null) return null;

  let source;
  try {
    const bytes = inflateRawSync(Buffer.from(code, "base64url"), { maxOutputLength: 1 << 20 });
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }

  const fidelity = params.get("fidelity");
  return {
    lang,
    source,
    theme: params.get("theme"),
    fidelity: fidelity === null ? null : fidelity.split(",").filter(Boolean),
  };
}

/**
 * the extension most fixtures for lang use
 * @param {string} lang
 */
function fixture_ext(lang) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const file of readdirSync(join(languages_dir, lang, "test"))) {
    // snapshot outputs, not inputs
    if (file.endsWith(".js")) continue;
    counts.set(extname(file), (counts.get(extname(file)) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(message);
  process.exit(1);
}

/** @param {string[]} args */
function main(args) {
  const [link, name] = args;
  if (!link) fail("usage: share_to_fixture.mjs '<link>' [fixture-name]");
  const shared = decode_share(link);
  if (!shared) fail("not a readable /explore/edit link");

  const fidelity =
    shared.fidelity === null ? "all" : shared.fidelity.length ? shared.fidelity.join(",") : "none";
  const settings = `lang ${shared.lang}, theme ${shared.theme ?? "unset"}, fidelity ${fidelity}`;

  if (!name) {
    console.error(settings);
    process.stdout.write(shared.source);
    return;
  }

  // name and lang both end up in a path, and the link is untrusted
  if (!/^[\w-]+$/.test(name)) fail(`fixture names are letters, digits, _ and -, not "${name}"`);
  const has_fixtures =
    readdirSync(languages_dir).includes(shared.lang) &&
    existsSync(join(languages_dir, shared.lang, "test"));
  if (!has_fixtures) fail(`languages/${shared.lang} has no test directory`);

  const ext = fixture_ext(shared.lang);
  if (!ext) fail(`languages/${shared.lang}/test has no fixtures to take an extension from`);
  const file = join(languages_dir, shared.lang, "test", `${name}${ext}`);
  if (existsSync(file)) fail(`${relative(root, file)} already exists`);

  writeFileSync(file, shared.source);
  console.log(`wrote ${relative(root, file)} (${settings})`);
  console.log(
    [
      "",
      "the fixture tests pair inputs with snapshots by sorted position, so they",
      "fail until this one has a snapshot. the snapshots tokenize with the raw",
      "grammar: reclassifier output and fidelity need a test of their own.",
    ].join("\n"),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
