# @twinkleplop/theme-rose-pine

[Rosé Pine](https://rosepinetheme.com) for twinkleplop, with Rosé Pine Dawn as the light variant and the main Rosé Pine as the dark variant. Colours come from the upstream palette, and the token mapping follows the official Rosé Pine VS Code theme.

```sh
pnpm add @twinkleplop/theme-rose-pine
```

Import the combined stylesheet to get light colours by default and dark colours under a `.dark` ancestor:

```ts
import "@twinkleplop/theme-rose-pine";
```

Import one variant on its own when the mode is fixed:

```ts
import "@twinkleplop/theme-rose-pine/light";
import "@twinkleplop/theme-rose-pine/dark";
```

The palettes are also available as data, keyed by token type:

```ts
import { light, dark } from "@twinkleplop/theme-rose-pine/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

VS Code renders comments, attribute names, builtin functions and some variables in italics. These stylesheets set colours only, so none of them are italic.
