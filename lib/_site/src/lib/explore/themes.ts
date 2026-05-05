// terminal flavors control the overall "chrome" of the explore view.
// each flavor sets a full set of css variables that drive backgrounds,
// borders, accents and the crt glow overlay.

export interface flavor_def {
	name: string;
	bg: string;
	bg_elev: string;
	bg_pane: string;
	fg: string;
	fg_dim: string;
	fg_muted: string;
	border: string;
	border_bright: string;
	accent: string;
	accent2: string;
	warn: string;
	glow: string;
	scanline: string;
}

export type flavor_name = 'phosphor' | 'amber' | 'paperwhite' | 'synth' | 'ember';

export const FLAVORS: Record<flavor_name, flavor_def> = {
	phosphor: {
		name: 'phosphor',
		bg: '#030907',
		bg_elev: '#0a1410',
		bg_pane: '#05100b',
		fg: '#a8ffc8',
		fg_dim: '#4a8f6a',
		fg_muted: '#2d5a43',
		border: '#153a28',
		border_bright: '#2a6447',
		accent: '#5dff9b',
		accent2: '#00ffaa',
		warn: '#ffdc5d',
		glow: '0 0 12px rgba(93,255,155,0.35)',
		scanline: 'rgba(93,255,155,0.04)'
	},
	amber: {
		name: 'amber',
		bg: '#0c0703',
		bg_elev: '#1a0f05',
		bg_pane: '#130a03',
		fg: '#ffb84d',
		fg_dim: '#9c6826',
		fg_muted: '#6b4417',
		border: '#3a2409',
		border_bright: '#5e3b12',
		accent: '#ffcb6b',
		accent2: '#ff8a3c',
		warn: '#ff6b35',
		glow: '0 0 14px rgba(255,184,77,0.3)',
		scanline: 'rgba(255,184,77,0.04)'
	},
	paperwhite: {
		name: 'paperwhite',
		bg: '#0f0f10',
		bg_elev: '#18181b',
		bg_pane: '#121214',
		fg: '#e8e4d9',
		fg_dim: '#8a8578',
		fg_muted: '#56524a',
		border: '#2a2822',
		border_bright: '#3f3c34',
		accent: '#d4c896',
		accent2: '#a8e0c8',
		warn: '#e8b56a',
		glow: '0 0 0 transparent',
		scanline: 'rgba(255,255,255,0.015)'
	},
	synth: {
		name: 'synth',
		bg: '#0a0415',
		bg_elev: '#150a28',
		bg_pane: '#10061f',
		fg: '#f0d4ff',
		fg_dim: '#9470b8',
		fg_muted: '#5c4080',
		border: '#2a1555',
		border_bright: '#4a2c80',
		accent: '#ff4ad6',
		accent2: '#4adaff',
		warn: '#ffd84a',
		glow: '0 0 18px rgba(255,74,214,0.4)',
		scanline: 'rgba(255,74,214,0.03)'
	},
	ember: {
		name: 'ember',
		bg: '#060708',
		bg_elev: '#0c0f14',
		bg_pane: '#080a0e',
		fg: '#ff8a3d',
		fg_dim: '#a35a28',
		fg_muted: '#6a3d1c',
		border: '#16304d',
		border_bright: '#234a78',
		accent: '#ff7a1f',
		accent2: '#4ea0ff',
		warn: '#ffb84a',
		glow: '0 0 14px rgba(255,122,31,0.55)',
		scanline: 'rgba(255,122,31,0.035)'
	}
};

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

export type theme_variant = 'github-light' | 'github-dark' | 'atom-one-light' | 'atom-one-dark';
export type theme_name = 'github' | 'atom-one';
export type theme_mode = 'light' | 'dark';

export interface theme_def {
	palette: token_palette;
	shiki_id: string;
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
	'atom-one-dark': { palette: atom_one_dark, shiki_id: 'one-dark-pro' }
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
		value: "'Geist Mono', ui-monospace, monospace"
	},
	{
		label: 'IBM Plex Mono',
		value: "'IBM Plex Mono', ui-monospace, monospace"
	},
	{ label: 'Fira Code', value: "'Fira Code', ui-monospace, monospace" }
];

export type density_mode = 'compact' | 'comfortable' | 'relaxed';

export interface tweak_state {
	theme: theme_name;
	font: string;
	density: density_mode;
	inspect: boolean;
	flavor: flavor_name;
	show_line_numbers: boolean;
	notation: boolean;
}

export const DEFAULT_TWEAKS: tweak_state = {
	theme: 'github',
	font: FONTS[0].value,
	density: 'comfortable',
	inspect: false,
	flavor: 'paperwhite',
	show_line_numbers: true,
	notation: true
};
