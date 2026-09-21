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

The palettes and font styles are also available as data, keyed by token type:

```ts
import { light, dark, light_styles, dark_styles } from "@twinkleplop/theme-rose-pine/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

Comments, parameters, constants, attribute names and CSS class, id and pseudo-class selectors are italic, and markdown headings and bold text are bold, as in VS Code. Each style is a variable too, such as `--twp-comment-font-style`, so you can override it.
