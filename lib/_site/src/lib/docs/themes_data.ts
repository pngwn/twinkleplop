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
  {
    name: "solarized",
    package_name: "@twinkleplop/theme-solarized",
    dark: {
      bg: "#002b36",
      fg: "#839496",
      com: "#586e75",
      kw: "#859900",
      str: "#2aa198",
      fn: "#268bd2",
      param: "#839496",
      type: "#859900",
      num: "#d33682",
    },
    light: {
      bg: "#fdf6e3",
      fg: "#657b83",
      com: "#93a1a1",
      kw: "#859900",
      str: "#2aa198",
      fn: "#268bd2",
      param: "#657b83",
      type: "#859900",
      num: "#d33682",
    },
    chips: ["#859900", "#2aa198", "#268bd2", "#d33682"],
  },
  {
    name: "night owl",
    package_name: "@twinkleplop/theme-night-owl",
    dark: {
      bg: "#011627",
      fg: "#d6deeb",
      com: "#637777",
      kw: "#c792ea",
      str: "#ecc48d",
      fn: "#82aaff",
      param: "#d7dbe0",
      type: "#c5e478",
      num: "#f78c6c",
    },
    light: {
      bg: "#fbfbfb",
      fg: "#403f53",
      com: "#989fb1",
      kw: "#994cc3",
      str: "#c96765",
      fn: "#4876d6",
      param: "#403f53",
      type: "#4876d6",
      num: "#aa0982",
    },
    chips: ["#c792ea", "#ecc48d", "#82aaff", "#c5e478"],
  },
  {
    name: "material",
    package_name: "@twinkleplop/theme-material",
    dark: {
      bg: "#263238",
      fg: "#EEFFFF",
      com: "#546E7A",
      kw: "#89DDFF",
      str: "#C3E88D",
      fn: "#82AAFF",
      param: "#EEFFFF",
      type: "#FFCB6B",
      num: "#F78C6C",
    },
    light: {
      bg: "#FAFAFA",
      fg: "#90A4AE",
      com: "#90A4AE",
      kw: "#39ADB5",
      str: "#91B859",
      fn: "#6182B8",
      param: "#90A4AE",
      type: "#E2931D",
      num: "#F76D47",
    },
    chips: ["#89DDFF", "#C3E88D", "#82AAFF", "#FFCB6B"],
  },
];
