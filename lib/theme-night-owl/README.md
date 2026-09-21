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

The palettes are also available as data, keyed by token type:

```ts
import { light, dark } from "@twinkleplop/theme-night-owl/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

twinkleplop has one type per token, so a few distinctions VS Code makes are merged. Light Owl gives `//` comments a slightly different grey from other comments, and every comment here uses the main comment grey. Night Owl's italics are not reproduced, because theme packages set colours only.
