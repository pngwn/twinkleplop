# @twinkleplop/theme-ayu

[Ayu](https://github.com/ayu-theme/ayu-colors) Light and Ayu Dark for twinkleplop. Colours come from the upstream ayu palette, and the token mapping follows the [ayu VS Code themes](https://github.com/ayu-theme/vscode-ayu).

```sh
pnpm add @twinkleplop/theme-ayu
```

Import the combined stylesheet to get light colours by default and dark colours under a `.dark` ancestor:

```ts
import "@twinkleplop/theme-ayu";
```

Import one variant on its own when the mode is fixed:

```ts
import "@twinkleplop/theme-ayu/light";
import "@twinkleplop/theme-ayu/dark";
```

The palettes are also available as data, keyed by token type:

```ts
import { light, dark } from "@twinkleplop/theme-ayu/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

VS Code dims separators (`;`, `,`) and HTML tag brackets with transparency. twinkleplop has a single `punctuation` type, so all punctuation uses the plain foreground colour.
