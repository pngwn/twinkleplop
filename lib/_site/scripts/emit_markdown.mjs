// Emit a markdown twin for every prerendered page, plus an llms.txt index.
//
// Runs after `vite build`. Each `build/<route>.html` gains a
// `build/<route>.md`, which the assets store serves at `/<route>.md` and the
// worker hands back from `/<route>` when the client asks for markdown.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { page_to_markdown } from "./html_to_markdown.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const build = join(site, "build");
const origin = (process.env.SITE_ORIGIN ?? "https://twinkleplop.pngwn.at").replace(/\/$/, "");

function html_files(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    // hashed app bundles, never a page
    if (entry === "_app") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...html_files(path));
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

/** `build/docs/migration.html` -> `/docs/migration`; `build/index.html` -> `/`. */
function route_of(file) {
  const rel = relative(build, file)
    .replaceAll("\\", "/")
    .replace(/\.html$/, "");
  if (rel === "index") return "/";
  return `/${rel.replace(/\/index$/, "")}`;
}

/** First heading and first paragraph, for the index entry. */
function summarise(markdown) {
  const lines = markdown.split("\n");
  const title =
    lines
      .find((l) => l.startsWith("# "))
      ?.slice(2)
      .trim() ?? "";
  const start = lines.findIndex((l) => l.startsWith("# "));
  const description =
    lines
      .slice(start + 1)
      .find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("```"))
      ?.trim() ?? "";
  return { title, description };
}

function yaml_escape(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

const pages = [];

for (const file of html_files(build).sort()) {
  const route = route_of(file);
  const url = `${origin}${route}`;
  const markdown = page_to_markdown(readFileSync(file, "utf8"), { url, origin });
  if (!markdown) continue;

  const { title, description } = summarise(markdown);
  const front = [
    "---",
    `title: ${yaml_escape(title)}`,
    description ? `description: ${yaml_escape(description)}` : "",
    `source: ${url}`,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync(file.replace(/\.html$/, ".md"), `${front}\n${markdown}`);
  pages.push({ route, url, title, description });
}

// llms.txt — the index an agent looks for before it starts guessing urls.
const home = pages.find((p) => p.route === "/");
const docs = pages
  .filter((p) => p.route.startsWith("/docs"))
  .sort((a, b) => a.route.localeCompare(b.route));
const rest = pages.filter((p) => p.route !== "/" && !p.route.startsWith("/docs"));

const section = (heading, items) =>
  items.length
    ? [
        `## ${heading}`,
        "",
        ...items.map(
          (p) =>
            `- [${p.title || p.route}](${p.url}.md)${p.description ? `: ${p.description}` : ""}`,
        ),
        "",
      ]
    : [];

const llms = [
  "# twinkleplop",
  "",
  `> ${home?.description ?? "A syntax highlighter that emits CSS classes."}`,
  "",
  "Every page is available as markdown: append `.md` to any url, or send",
  "`Accept: text/markdown`.",
  "",
  ...section("Docs", docs),
  ...section("Other", rest),
].join("\n");

writeFileSync(join(build, "llms.txt"), `${llms}\n`);

console.log(`markdown: ${pages.length} pages + llms.txt`);
