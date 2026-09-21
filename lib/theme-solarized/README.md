# @twinkleplop/theme-solarized

[Solarized](https://ethanschoonover.com/solarized/) Light and Solarized Dark for twinkleplop. Colours come from the upstream palette, and the token mapping follows the Solarized themes built into VS Code.

```sh
pnpm add @twinkleplop/theme-solarized
```

Import the combined stylesheet to get light colours by default and dark colours under a `.dark` ancestor:

```ts
import "@twinkleplop/theme-solarized";
```

Import one variant on its own when the mode is fixed:

```ts
import "@twinkleplop/theme-solarized/light";
import "@twinkleplop/theme-solarized/dark";
```

The palettes are also available as data, keyed by token type:

```ts
import { light, dark } from "@twinkleplop/theme-solarized/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

VS Code gives `storage` keywords (`const`, `let`, `fn`) their own bold grey. twinkleplop has a single `keyword` type, so every keyword is Solarized green.
