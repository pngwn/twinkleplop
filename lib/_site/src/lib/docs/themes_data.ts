// swatch data for /docs/themes-ref.
//
// values are copied from each theme package's `src/tokens.ts` palette, so a
// swatch always shows what the published stylesheet actually renders. when a
// palette changes, update the matching entry here.

export type preview = {
  bg: string;
  fg: string;
  com: string;
  kw: string;
  str: string;
  fn: string;
  param: string;
  type: string;
  num: string;
};

export type swatch = {
  name: string;
  package_name: string;
  dark: preview;
  light: preview;
  chips: string[];
};

export const THEMES: swatch[] = [
  {
    name: "github",
    package_name: "@twinkleplop/theme-github",
    dark: {
      bg: "#0d1117",
      fg: "#e6edf3",
      com: "#8b949e",
      kw: "#ff7b72",
      str: "#a5d6ff",
      fn: "#d2a8ff",
      param: "#ffa657",
      type: "#79c0ff",
      num: "#79c0ff",
    },
    light: {
      bg: "#ffffff",
      fg: "#1f2328",
      com: "#6e7781",
      kw: "#cf222e",
      str: "#0a3069",
      fn: "#8250df",
      param: "#953800",
      type: "#0550ae",
      num: "#0550ae",
    },
    chips: ["#ff7b72", "#a5d6ff", "#d2a8ff", "#79c0ff"],
  },
  {
    name: "atom one",
    package_name: "@twinkleplop/theme-atom-one",
    dark: {
      bg: "#282c34",
      fg: "#abb2bf",
      com: "#7f848e",
      kw: "#c678dd",
      str: "#98c379",
      fn: "#61afef",
      param: "#e06c75",
      type: "#e5c07b",
      num: "#d19a66",
    },
    light: {
      bg: "#fafafa",
      fg: "#383a42",
      com: "#a0a1a7",
      kw: "#a626a4",
      str: "#50a14f",
      fn: "#4078f2",
      param: "#e45649",
      type: "#c18401",
      num: "#986801",
    },
    chips: ["#c678dd", "#98c379", "#61afef", "#e5c07b"],
  },
];
