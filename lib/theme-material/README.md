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

The palettes and font styles are also available as data, keyed by token type:

```ts
import { light, dark, light_styles, dark_styles } from "@twinkleplop/theme-material/tokens";
```

Each stylesheet sets `--twp-background` to the theme's editor background but does not apply it. Use `background: var(--twp-background)` on your code container to opt in.

Material's italics, bold and underlines come from variables too, so you can turn one off with plain CSS:

```css
.twinkleplop {
  --twp-keyword-font-style: normal;
}
```

twinkleplop has one type per token, so a few distinctions VS Code makes are merged. Every keyword is cyan italic like `import` and `return`, including declaration keywords such as `const` and `function` that VS Code draws in upright purple. Every function name is blue, including the method definitions VS Code draws in red. Property names are red like object keys and class fields, including the CSS properties VS Code draws in pale blue.
