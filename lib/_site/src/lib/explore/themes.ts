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

export type flavor_name =
	| "phosphor"
	| "amber"
	| "paperwhite"
	| "synth"
	| "ember";

export const FLAVORS: Record<flavor_name, flavor_def> = {
	phosphor: {
		name: "phosphor",
		bg: "#030907",
		bg_elev: "#0a1410",
		bg_pane: "#05100b",
		fg: "#a8ffc8",
		fg_dim: "#4a8f6a",
		fg_muted: "#2d5a43",
		border: "#153a28",
		border_bright: "#2a6447",
		accent: "#5dff9b",
		accent2: "#00ffaa",
		warn: "#ffdc5d",
		glow: "0 0 12px rgba(93,255,155,0.35)",
		scanline: "rgba(93,255,155,0.04)",
	},
	amber: {
		name: "amber",
		bg: "#0c0703",
		bg_elev: "#1a0f05",
		bg_pane: "#130a03",
		fg: "#ffb84d",
		fg_dim: "#9c6826",
		fg_muted: "#6b4417",
		border: "#3a2409",
		border_bright: "#5e3b12",
		accent: "#ffcb6b",
		accent2: "#ff8a3c",
		warn: "#ff6b35",
		glow: "0 0 14px rgba(255,184,77,0.3)",
		scanline: "rgba(255,184,77,0.04)",
	},
	paperwhite: {
		name: "paperwhite",
		bg: "#0f0f10",
		bg_elev: "#18181b",
		bg_pane: "#121214",
		fg: "#e8e4d9",
		fg_dim: "#8a8578",
		fg_muted: "#56524a",
		border: "#2a2822",
		border_bright: "#3f3c34",
		accent: "#d4c896",
		accent2: "#a8e0c8",
		warn: "#e8b56a",
		glow: "0 0 0 transparent",
		scanline: "rgba(255,255,255,0.015)",
	},
	synth: {
		name: "synth",
		bg: "#0a0415",
		bg_elev: "#150a28",
		bg_pane: "#10061f",
		fg: "#f0d4ff",
		fg_dim: "#9470b8",
		fg_muted: "#5c4080",
		border: "#2a1555",
		border_bright: "#4a2c80",
		accent: "#ff4ad6",
		accent2: "#4adaff",
		warn: "#ffd84a",
		glow: "0 0 18px rgba(255,74,214,0.4)",
		scanline: "rgba(255,74,214,0.03)",
	},
	ember: {
		name: "ember",
		bg: "#060708",
		bg_elev: "#0c0f14",
		bg_pane: "#080a0e",
		fg: "#ff8a3d",
		fg_dim: "#a35a28",
		fg_muted: "#6a3d1c",
		border: "#16304d",
		border_bright: "#234a78",
		accent: "#ff7a1f",
		accent2: "#4ea0ff",
		warn: "#ffb84a",
		glow: "0 0 14px rgba(255,122,31,0.55)",
		scanline: "rgba(255,122,31,0.035)",
	},
};

export type token_palette = Record<string, string>;

export type plop_theme_name =
	| "plop-noir"
	| "plop-lumen"
	| "plop-phosphor"
	| "plop-synth";

export const PLOP_THEMES: Record<plop_theme_name, token_palette> = {
	"plop-noir": {
		keyword: "#ff9ed4",
		type: "#b8e8ff",
		string: "#c9e896",
		number: "#ffcc88",
		comment: "#5a5a6e",
		func: "#9dc4ff",
		ident: "#e8e4e0",
		constant: "#ffb38a",
		operator: "#a89df0",
		punct: "#8a8598",
		property: "#8ae0c0",
		decorator: "#ffd080",
		tag: "#ff9ed4",
		attr: "#ffcc88",
		text: "#e8e4e0",
		ws: "inherit",
		lifetime: "#ff8fb0",
		macro: "#ffc070",
		selector: "#ff9ed4",
		rune: "#ffb0ff",
		"interp-open": "#ffb0ff",
		"interp-close": "#ffb0ff",
	},
	"plop-lumen": {
		keyword: "#ff6b9d",
		type: "#4db8e8",
		string: "#7ac74f",
		number: "#f5a93a",
		comment: "#8a8a8a",
		func: "#5294ff",
		ident: "#1a1a1a",
		constant: "#d96a2e",
		operator: "#7560d9",
		punct: "#5a5a5a",
		property: "#0e9670",
		decorator: "#d17f1a",
		tag: "#c9447a",
		attr: "#d17f1a",
		text: "#1a1a1a",
		ws: "inherit",
		lifetime: "#d94470",
		macro: "#c96a00",
		selector: "#c9447a",
		rune: "#c92aa8",
		"interp-open": "#c92aa8",
		"interp-close": "#c92aa8",
	},
	"plop-phosphor": {
		keyword: "#5dff9b",
		type: "#78f0c8",
		string: "#d8ffaa",
		number: "#aaffd4",
		comment: "#3d7050",
		func: "#7effb0",
		ident: "#a8ffc8",
		constant: "#ffdc5d",
		operator: "#5dff9b",
		punct: "#4a8f6a",
		property: "#aaffd4",
		decorator: "#ffdc5d",
		tag: "#5dff9b",
		attr: "#aaffd4",
		text: "#a8ffc8",
		ws: "inherit",
		lifetime: "#ffb8d4",
		macro: "#ffdc5d",
		selector: "#5dff9b",
		rune: "#c0ffff",
		"interp-open": "#c0ffff",
		"interp-close": "#c0ffff",
	},
	"plop-synth": {
		keyword: "#ff4ad6",
		type: "#4adaff",
		string: "#b8ff6b",
		number: "#ffd84a",
		comment: "#5c4080",
		func: "#ff8adc",
		ident: "#f0d4ff",
		constant: "#ffa04a",
		operator: "#ff4ad6",
		punct: "#9470b8",
		property: "#4adaff",
		decorator: "#ffd84a",
		tag: "#ff4ad6",
		attr: "#4adaff",
		text: "#f0d4ff",
		ws: "inherit",
		lifetime: "#ff80a8",
		macro: "#ffd84a",
		selector: "#ff4ad6",
		rune: "#c080ff",
		"interp-open": "#c080ff",
		"interp-close": "#c080ff",
	},
};

export type shiki_theme_name =
	| "github-dark"
	| "github-light"
	| "rose-pine"
	| "catppuccin-mocha";

export const SHIKI_THEMES: Record<shiki_theme_name, token_palette> = {
	"github-dark": {
		keyword: "#ff7b72",
		type: "#79c0ff",
		string: "#a5d6ff",
		number: "#79c0ff",
		comment: "#8b949e",
		func: "#d2a8ff",
		ident: "#c9d1d9",
		constant: "#79c0ff",
		operator: "#ff7b72",
		punct: "#c9d1d9",
		property: "#c9d1d9",
		decorator: "#d2a8ff",
		tag: "#7ee787",
		attr: "#79c0ff",
		text: "#c9d1d9",
		ws: "inherit",
	},
	"github-light": {
		keyword: "#cf222e",
		type: "#0550ae",
		string: "#0a3069",
		number: "#0550ae",
		comment: "#6e7781",
		func: "#8250df",
		ident: "#1f2328",
		constant: "#0550ae",
		operator: "#cf222e",
		punct: "#1f2328",
		property: "#1f2328",
		decorator: "#8250df",
		tag: "#116329",
		attr: "#0550ae",
		text: "#1f2328",
		ws: "inherit",
	},
	"rose-pine": {
		keyword: "#c4a7e7",
		type: "#9ccfd8",
		string: "#f6c177",
		number: "#eb6f92",
		comment: "#6e6a86",
		func: "#ebbcba",
		ident: "#e0def4",
		constant: "#eb6f92",
		operator: "#31748f",
		punct: "#908caa",
		property: "#e0def4",
		decorator: "#ebbcba",
		tag: "#c4a7e7",
		attr: "#9ccfd8",
		text: "#e0def4",
		ws: "inherit",
	},
	"catppuccin-mocha": {
		keyword: "#cba6f7",
		type: "#f9e2af",
		string: "#a6e3a1",
		number: "#fab387",
		comment: "#6c7086",
		func: "#89b4fa",
		ident: "#cdd6f4",
		constant: "#fab387",
		operator: "#89dceb",
		punct: "#bac2de",
		property: "#cdd6f4",
		decorator: "#f5c2e7",
		tag: "#cba6f7",
		attr: "#f9e2af",
		text: "#cdd6f4",
		ws: "inherit",
	},
};

export interface mono_font {
	label: string;
	value: string;
}

export const FONTS: mono_font[] = [
	{
		label: "Berkeley Mono",
		value:
			"'Berkeley Mono', 'JetBrains Mono', ui-monospace, monospace",
	},
	{
		label: "JetBrains Mono",
		value: "'JetBrains Mono', ui-monospace, monospace",
	},
	{
		label: "Geist Mono",
		value: "'Geist Mono', ui-monospace, monospace",
	},
	{
		label: "IBM Plex Mono",
		value: "'IBM Plex Mono', ui-monospace, monospace",
	},
	{ label: "Fira Code", value: "'Fira Code', ui-monospace, monospace" },
];

export type density_mode = "compact" | "comfortable" | "relaxed";

export interface tweak_state {
	plop_theme: plop_theme_name;
	shiki_theme: shiki_theme_name;
	font: string;
	density: density_mode;
	diff: boolean;
	flavor: flavor_name;
	show_line_numbers: boolean;
}

export const DEFAULT_TWEAKS: tweak_state = {
	plop_theme: "plop-noir",
	shiki_theme: "github-dark",
	font: FONTS[0].value,
	density: "comfortable",
	diff: false,
	flavor: "paperwhite",
	show_line_numbers: true,
};
