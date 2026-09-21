# @twinkleplop/theme-material

[Material Theme](https://marketplace.visualstudio.com/items?itemName=Equinusocio.vsc-material-theme) Lighter and the default Material Theme for twinkleplop. Colours and token mapping follow the last release of the VS Code extension, 34.7.16, which shiki bundles as `material-theme-lighter` and `material-theme`.

```sh
pnpm add @twinkleplop/theme-material
```

Import the combined stylesheet to get light colours by default and dark colours under a `.dark` ancestor:

```ts
import "@twinkleplop/theme-material";
```

Import one variant on its own when the mode is fixed:

```ts
import "@twinkleplop/theme-material/light";
import "@twinkleplop/theme-material/dark";
```

The palettes are also available as data, keyed by token type:

```ts
import { light, dark } from "@twinkleplop/theme-material/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

VS Code shows declaration keywords (`const`, `function`, `class`) in purple and control keywords (`import`, `return`, `if`) in cyan. twinkleplop has a single `keyword` type, so every keyword is purple. Property names use the pale blue of CSS properties. VS Code shows object and YAML keys in red, and colours JSON keys by nesting depth.
