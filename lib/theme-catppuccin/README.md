# @twinkleplop/theme-catppuccin

[Catppuccin](https://catppuccin.com) Latte and Catppuccin Mocha for twinkleplop. Latte is the light variant and Mocha is the dark one. Colours come from the upstream palette, and the token mapping follows the official Catppuccin VS Code theme.

```sh
pnpm add @twinkleplop/theme-catppuccin
```

Import the combined stylesheet to get Latte by default and Mocha under a `.dark` ancestor:

```ts
import "@twinkleplop/theme-catppuccin";
```

Import one variant on its own when the mode is fixed:

```ts
import "@twinkleplop/theme-catppuccin/light";
import "@twinkleplop/theme-catppuccin/dark";
```

The palettes and font styles are also available as data, keyed by token type:

```ts
import { light, dark, light_styles, dark_styles } from "@twinkleplop/theme-catppuccin/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

Catppuccin's italics, bold and strikethrough come from variables too, so you can turn one off with plain CSS:

```css
.twinkleplop {
  --twp-comment-font-style: normal;
}
```

VS Code gives each markdown heading level its own colour. twinkleplop has a single `heading` type, so every heading uses the level 1 red.
