# @twinkleplop/theme-night-owl

[Night Owl](https://github.com/sdras/night-owl-vscode-theme) and its light counterpart, Light Owl, for twinkleplop. Colours and token mapping come from the Night Owl VS Code themes (the italic versions).

```sh
pnpm add @twinkleplop/theme-night-owl
```

Import the combined stylesheet to get Light Owl by default and Night Owl under a `.dark` ancestor:

```ts
import "@twinkleplop/theme-night-owl";
```

Import one variant on its own when the mode is fixed:

```ts
import "@twinkleplop/theme-night-owl/light";
import "@twinkleplop/theme-night-owl/dark";
```

The palettes and font styles are also available as data, keyed by token type:

```ts
import { light, dark, light_styles, dark_styles } from "@twinkleplop/theme-night-owl/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

Night Owl's italics, bold and underlines come from variables too, so you can turn one off with plain CSS:

```css
.twinkleplop {
  --twp-comment-font-style: normal;
}
```

twinkleplop has one type per token, so a few distinctions VS Code makes are merged. Light Owl gives `//` comments a slightly different grey from other comments, and every comment here uses the main comment grey. Keywords stay upright, because Night Owl italicises only some of them, such as `return` and `import`.
