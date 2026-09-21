export type token_palette = Record<string, string>;

// A single theme selection drives both panes. For the plop pane we use
// the palette (full --twp-* var set, including --twp-background). For
// the shiki pane we pass `shiki_id` through to `codeToHtml({ theme })`
// — shiki bakes its own inline styles into the returned HTML, so no
// palette duplication lives here. The id MAY differ from our canonical
// theme name when upstream names diverge (e.g. catppuccin's "latte" /
// "mocha" vs. our "catppuccin-light" / "catppuccin-dark"), hence the
// explicit mapping rather than a blind string reuse.
import { dark as github_dark, light as github_light } from '@twinkleplop/theme-github/tokens';
import { dark as atom_one_dark, light as atom_one_light } from '@twinkleplop/theme-atom-one/tokens';
import {
	dark as solarized_dark,
	light as solarized_light
} from '@twinkleplop/theme-solarized/tokens';
import {
	dark as night_owl_dark,
	dark_styles as night_owl_dark_styles,
	light as night_owl_light,
	light_styles as night_owl_light_styles
} from '@twinkleplop/theme-night-owl/tokens';
import {
	dark as ayu_dark,
	dark_styles as ayu_dark_styles,
	light as ayu_light,
	light_styles as ayu_light_styles
} from '@twinkleplop/theme-ayu/tokens';
import type { theme_styles } from '@twinkleplop/core/types';

export type theme_variant =
	| 'github-light'
	| 'github-dark'
	| 'atom-one-light'
	| 'atom-one-dark'
	| 'solarized-light'
	| 'solarized-dark'
	| 'night-owl-light'
	| 'night-owl-dark'
	| 'ayu-light'
	| 'ayu-dark';
export type theme_name = 'github' | 'atom-one' | 'solarized' | 'night-owl' | 'ayu';
export type theme_mode = 'light' | 'dark';

export interface theme_def {
	palette: token_palette;
	shiki_id: string;
	// absent for themes that leave font styles to the lab stylesheet
	styles?: theme_styles;
}

// shiki ships TWO github theme families: `github-dark` / `github-light`
// are a legacy snapshot (e.g. class_name renders #b392f0 purple from an
// old `entity.name` rule), while `github-dark-default` / `-light-default`
// track the current primer/github-vscode-theme — which is the theme our
// palette is ported from. Pin to the `-default` variants so both panes
// resolve class_name, function, etc. to the same hexes.
export const THEMES: Record<theme_variant, theme_def> = {
	'github-light': { palette: github_light, shiki_id: 'github-light-default' },
	'github-dark': { palette: github_dark, shiki_id: 'github-dark-default' },
	'atom-one-light': { palette: atom_one_light, shiki_id: 'one-light' },
	'atom-one-dark': { palette: atom_one_dark, shiki_id: 'one-dark-pro' },
	'solarized-light': { palette: solarized_light, shiki_id: 'solarized-light' },
	'solarized-dark': { palette: solarized_dark, shiki_id: 'solarized-dark' },
	'night-owl-light': {
		palette: night_owl_light,
		shiki_id: 'night-owl-light',
		styles: night_owl_light_styles
	},
	'night-owl-dark': {
		palette: night_owl_dark,
		shiki_id: 'night-owl',
		styles: night_owl_dark_styles
	},
	'ayu-light': { palette: ayu_light, shiki_id: 'ayu-light', styles: ayu_light_styles },
	'ayu-dark': { palette: ayu_dark, shiki_id: 'ayu-dark', styles: ayu_dark_styles }
};

export function resolve_theme(core: theme_name, mode: theme_mode): theme_def {
	return THEMES[`${core}-${mode}` as theme_variant];
}

// kept for existing shiki preload calls that enumerate every id that
// might be requested. derived from THEMES so the list stays in sync.
export const SHIKI_THEME_IDS = Object.values(THEMES).map((t) => t.shiki_id);

export interface mono_font {
	label: string;
	value: string;
	// google fonts `family=` spec, loaded on first use
	google?: string;
}

export const FONTS: mono_font[] = [
	{
		label: 'Berkeley Mono',
		value: "'Berkeley Mono', 'JetBrains Mono', ui-monospace, monospace"
	},
	{
		label: 'JetBrains Mono',
		value: "'JetBrains Mono', ui-monospace, monospace"
	},
	{
		label: 'Geist Mono',
		value: "'Geist Mono', ui-monospace, monospace",
		google: 'Geist+Mono:wght@400;500;700'
	},
	{
		label: 'IBM Plex Mono',
		value: "'IBM Plex Mono', ui-monospace, monospace",
		google: 'IBM+Plex+Mono:ital,wght@0,400;0,500;0,700;1,400'
	},
	{
		label: 'Fira Code',
		value: "'Fira Code', ui-monospace, monospace",
		google: 'Fira+Code:wght@400;500;700'
	}
];

export const THEME_NAMES: theme_name[] = ['github', 'atom-one', 'solarized', 'night-owl', 'ayu'];

export interface lab_view {
	theme: theme_name;
	// a FONTS label
	font: string;
	inspect: boolean;
	show_line_numbers: boolean;
}

export const DEFAULT_VIEW: lab_view = {
	theme: 'github',
	font: FONTS[0].label,
	inspect: false,
	show_line_numbers: true
};
