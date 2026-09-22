export type doc_entry = {
  id: string;
  title: string;
  path: string;
  crumb: string;
  /** one line describing the page; also used as its meta description */
  blurb: string;
  icon: string;
};

export type doc_group = {
  group: string;
  items: doc_entry[];
};

export const DOCS: doc_group[] = [
  {
    group: "Build",
    items: [
      {
        id: "getting_started",
        title: "Getting started",
        path: "/docs/getting_started",
        crumb: "docs / getting-started",
        blurb: "Install and highlight your first snippet.",
        icon: "◐",
      },
      {
        id: "languages",
        title: "Languages",
        path: "/docs/languages",
        crumb: "docs / languages",
        blurb: "Working with language packages.",
        icon: "⇢",
      },
      {
        id: "themes",
        title: "Themes",
        path: "/docs/themes",
        crumb: "docs / themes",
        blurb: "Eight themes ship today, each with a light and a dark variant. Themes are CSS custom properties and can be customised with plain CSS.",
        icon: "↔",
      },
      {
        id: "render_options",
        title: "Render options",
        path: "/docs/render_options",
        crumb: "docs / render-options",
        blurb: "Per-call options on the renderer: classes, attributes, overlays, hooks and whitespace.",
        icon: "↔",
      },
      {
        id: "line_numbers",
        title: "Line numbers",
        path: "/docs/line_numbers",
        crumb: "docs / line-numbers",
        blurb: "Add line numbers to highlighted code.",
        icon: "↔",
      },
      {
        id: "directives",
        title: "Directives",
        path: "/docs/directives",
        crumb: "docs / directives",
        blurb: "Comment directives for marking regions of source code.",
        icon: "↔",
      },
      {
        id: "diffs",
        title: "Diffs",
        path: "/docs/diffs",
        crumb: "docs / diffs",
        blurb: "Highlight patch files or use directives to mark changes in source code.",
        icon: "↔",
      },
      {
        id: "fidelity",
        title: "Fidelity",
        path: "/docs/fidelity",
        crumb: "docs / fidelity",
        blurb: "Choose which token types the reclassifier identifies.",
        icon: "↔",
      },
      {
        id: "twoslash",
        title: "Twoslash",
        path: "/docs/twoslash",
        crumb: "docs / twoslash",
        blurb: "TypeScript type information rendered into the highlighted output.",
        icon: "↔",
      },
    ],
  },
  {
    group: "Markdown",
    items: [
      {
        id: "markdown",
        title: "Markdown",
        path: "/docs/markdown",
        crumb: "docs / markdown",
        blurb: "Highlight code in rehype, remark and markdown-it.",
        icon: "¶",
      },
    ],
  },
  {
    group: "Migration",
    items: [
      {
        id: "migration",
        title: "From shiki",
        path: "/docs/migration",
        crumb: "docs / migration",
        blurb: "Move a Shiki setup to Twinkleplop.",
        icon: "¶",
      },
    ],
  },
  {
    group: "Reference",
    items: [
      {
        id: "api",
        title: "Core API",
        path: "/docs/api",
        crumb: "docs / reference / api",
        blurb: "Functions and options exported by language packages and @twinkleplop/core.",
        icon: "¶",
      },
      {
        id: "languages-ref",
        title: "Languages",
        path: "/docs/languages-ref",
        crumb: "docs / reference / languages",
        blurb: "Supported languages and their packages.",
        icon: "◐",
      },
      {
        id: "themes-ref",
        title: "Themes",
        path: "/docs/themes-ref",
        crumb: "docs / reference / themes",
        blurb: "Available themes and supported token types.",
        icon: "◐",
      },
      {
        id: "grammar",
        title: "Grammars",
        path: "/docs/grammar",
        crumb: "docs / reference / grammar",
        blurb: "Define a language grammar using rule helpers.",
        icon: "¶",
      },
      {
        id: "reclassifier",
        title: "Reclassifiers",
        path: "/docs/reclassifier",
        crumb: "docs / reference / reclassifier",
        blurb: "Assign more specific token types and highlight embedded languages.",
        icon: "¶",
      },
    ],
  },
  {
    group: "Technical",
    items: [
      {
        id: "architecture",
        title: "Architecture",
        path: "/docs/architecture",
        crumb: "docs / technical / architecture",
        blurb: "The tokenizer, reclassifier pipeline, renderer and package structure.",
        icon: "¶",
      },
      {
        id: "tokenization",
        title: "Tokenization",
        path: "/docs/tokenization",
        crumb: "docs / technical / tokenization",
        blurb: "How source code is tokenized, reclassified and rendered.",
        icon: "¶",
      },
      {
        id: "benchmarks",
        title: "Benchmarks",
        path: "/docs/benchmarks",
        crumb: "docs / technical / benchmarks",
        blurb: "How fast twinkleplop highlights compared to other JavaScript highlighters.",
        icon: "¶",
      },
    ],
  },
  {
    group: "Help",
    items: [
      {
        id: "faq",
        title: "FAQ",
        path: "/docs/faq",
        crumb: "docs / faq",
        blurb: "Answers to the questions no-one actually asked.",
        icon: "?",
      },
    ],
  },
];

export const FLAT: (doc_entry & { group: string })[] = DOCS.flatMap((g) =>
  g.items.map((it) => ({ ...it, group: g.group })),
);

export function find_by_id(id: string): (doc_entry & { group: string }) | undefined {
  return FLAT.find((it) => it.id === id);
}

export function neighbors(id: string): {
  prev?: doc_entry & { group: string };
  next?: doc_entry & { group: string };
} {
  const i = FLAT.findIndex((it) => it.id === id);
  if (i < 0) return {};
  return {
    prev: i > 0 ? FLAT[i - 1] : undefined,
    next: i < FLAT.length - 1 ? FLAT[i + 1] : undefined,
  };
}
