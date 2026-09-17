export type doc_entry = {
  id: string;
  title: string;
  path: string;
  crumb: string;
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
        icon: "◐",
      },
      {
        id: "languages",
        title: "Languages",
        path: "/docs/languages",
        crumb: "docs / languages",
        icon: "⇢",
      },
      {
        id: "themes",
        title: "Themes",
        path: "/docs/themes",
        crumb: "docs / themes",
        icon: "↔",
      },
      {
        id: "render_options",
        title: "Render options",
        path: "/docs/render_options",
        crumb: "docs / render-options",
        icon: "↔",
      },
      {
        id: "line_numbers",
        title: "Line numbers",
        path: "/docs/line_numbers",
        crumb: "docs / line-numbers",
        icon: "↔",
      },
      {
        id: "directives",
        title: "Directives",
        path: "/docs/directives",
        crumb: "docs / directives",
        icon: "↔",
      },
      {
        id: "diffs",
        title: "Diffs",
        path: "/docs/diffs",
        crumb: "docs / diffs",
        icon: "↔",
      },
      {
        id: "fidelity",
        title: "Fidelity",
        path: "/docs/fidelity",
        crumb: "docs / fidelity",
        icon: "↔",
      },
      {
        id: "twoslash",
        title: "Twoslash",
        path: "/docs/twoslash",
        crumb: "docs / twoslash",
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
        icon: "¶",
      },
      {
        id: "languages-ref",
        title: "Languages",
        path: "/docs/languages-ref",
        crumb: "docs / reference / languages",
        icon: "◐",
      },
      {
        id: "themes-ref",
        title: "Themes",
        path: "/docs/themes-ref",
        crumb: "docs / reference / themes",
        icon: "◐",
      },
      {
        id: "grammar",
        title: "Grammars",
        path: "/docs/grammar",
        crumb: "docs / reference / grammar",
        icon: "¶",
      },
      {
        id: "reclassifier",
        title: "Reclassifiers",
        path: "/docs/reclassifier",
        crumb: "docs / reference / reclassifier",
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
        icon: "¶",
      },
      {
        id: "tokenization",
        title: "Tokenization",
        path: "/docs/tokenization",
        crumb: "docs / technical / tokenization",
        icon: "¶",
      },
      {
        id: "benchmarks",
        title: "Benchmarks",
        path: "/docs/benchmarks",
        crumb: "docs / technical / benchmarks",
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
