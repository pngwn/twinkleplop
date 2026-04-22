export type preview = {
	bg: string;
	fg: string;
	com: string;
	kw: string;
	str: string;
	fn: string;
	param: string;
	type: string;
	num: string;
};

export type swatch = {
	name: string;
	dark: preview;
	light: preview;
	chips: string[];
};

export const THEMES: swatch[] = [
	{
		name: "github",
		dark: {
			bg: "#0d1117", fg: "#c9d1d9", com: "#8b949e", kw: "#ff7b72",
			str: "#a5d6ff", fn: "#d2a8ff", param: "#79c0ff", type: "#ffa657", num: "#f0883e",
		},
		light: {
			bg: "#ffffff", fg: "#24292f", com: "#6e7781", kw: "#cf222e",
			str: "#0a3069", fn: "#8250df", param: "#0550ae", type: "#953800", num: "#953800",
		},
		chips: ["#ff7b72", "#a5d6ff", "#f0883e", "#d2a8ff", "#cf222e", "#0a3069"],
	},
	{
		name: "twinkle-crt",
		dark: {
			bg: "#020604", fg: "#a6f2be", com: "#3d8a5a", kw: "#7fe08a",
			str: "#f2c94c", fn: "#5fd4c4", param: "#c59bff", type: "#6aa9ff", num: "#f29a6d",
		},
		light: {
			bg: "#f0f8f3", fg: "#0b3a1e", com: "#6a8a7a", kw: "#2a7a3a",
			str: "#9a7a10", fn: "#186a62", param: "#6a3ab0", type: "#2a5ab8", num: "#b85a20",
		},
		chips: ["#7fe08a", "#f2c94c", "#f29a6d", "#5fd4c4", "#2a7a3a", "#9a7a10"],
	},
	{
		name: "twinkle-plasma",
		dark: {
			bg: "#0a0210", fg: "#f0e6ff", com: "#7a6688", kw: "#f26d6d",
			str: "#f2c94c", fn: "#c59bff", param: "#6aa9ff", type: "#5fd4c4", num: "#f29a6d",
		},
		light: {
			bg: "#fbf5ff", fg: "#2a1038", com: "#8a7a9a", kw: "#b8306d",
			str: "#9a7a10", fn: "#6a3ab0", param: "#2a5ab8", type: "#186a62", num: "#b85a20",
		},
		chips: ["#f26d6d", "#f2c94c", "#f29a6d", "#c59bff", "#b8306d", "#9a7a10"],
	},
	{
		name: "dracula",
		dark: {
			bg: "#282a36", fg: "#f8f8f2", com: "#6272a4", kw: "#ff79c6",
			str: "#f1fa8c", fn: "#50fa7b", param: "#ffb86c", type: "#8be9fd", num: "#bd93f9",
		},
		light: {
			bg: "#f8f8f2", fg: "#282a36", com: "#8890a0", kw: "#d03080",
			str: "#8a7a10", fn: "#2a7a3a", param: "#a85a20", type: "#1a7a98", num: "#6240a8",
		},
		chips: ["#ff79c6", "#f1fa8c", "#bd93f9", "#50fa7b", "#d03080", "#8a7a10"],
	},
	{
		name: "tokyo-night",
		dark: {
			bg: "#1a1b26", fg: "#a9b1d6", com: "#565f89", kw: "#bb9af7",
			str: "#9ece6a", fn: "#7aa2f7", param: "#e0af68", type: "#2ac3de", num: "#ff9e64",
		},
		light: {
			bg: "#e1e2e7", fg: "#3760bf", com: "#8990b3", kw: "#8839ef",
			str: "#587539", fn: "#2e5aa8", param: "#8c6c00", type: "#006a8a", num: "#b15c00",
		},
		chips: ["#bb9af7", "#9ece6a", "#ff9e64", "#7aa2f7", "#8839ef", "#587539"],
	},
	{
		name: "nord",
		dark: {
			bg: "#2e3440", fg: "#d8dee9", com: "#4c566a", kw: "#81a1c1",
			str: "#a3be8c", fn: "#88c0d0", param: "#ebcb8b", type: "#8fbcbb", num: "#b48ead",
		},
		light: {
			bg: "#eceff4", fg: "#2e3440", com: "#5e6878", kw: "#5e81ac",
			str: "#2a7a3a", fn: "#1a7a98", param: "#8a7a10", type: "#186a62", num: "#6a3ab0",
		},
		chips: ["#81a1c1", "#a3be8c", "#b48ead", "#88c0d0", "#5e81ac", "#2a7a3a"],
	},
	{
		name: "solarized",
		dark: {
			bg: "#002b36", fg: "#839496", com: "#586e75", kw: "#859900",
			str: "#2aa198", fn: "#268bd2", param: "#6c71c4", type: "#b58900", num: "#d33682",
		},
		light: {
			bg: "#fdf6e3", fg: "#657b83", com: "#93a1a1", kw: "#859900",
			str: "#2aa198", fn: "#268bd2", param: "#6c71c4", type: "#b58900", num: "#d33682",
		},
		chips: ["#859900", "#2aa198", "#d33682", "#268bd2", "#859900", "#2aa198"],
	},
	{
		name: "monokai",
		dark: {
			bg: "#272822", fg: "#f8f8f2", com: "#75715e", kw: "#f92672",
			str: "#e6db74", fn: "#a6e22e", param: "#fd971f", type: "#66d9ef", num: "#ae81ff",
		},
		light: {
			bg: "#fafafa", fg: "#272822", com: "#9a907a", kw: "#c0226c",
			str: "#8a7a10", fn: "#4a8a10", param: "#c05a10", type: "#1a7a98", num: "#7040b0",
		},
		chips: ["#f92672", "#e6db74", "#ae81ff", "#a6e22e", "#c0226c", "#8a7a10"],
	},
	{
		name: "one",
		dark: {
			bg: "#282c34", fg: "#abb2bf", com: "#5c6370", kw: "#c678dd",
			str: "#98c379", fn: "#61afef", param: "#56b6c2", type: "#e06c75", num: "#d19a66",
		},
		light: {
			bg: "#fafafa", fg: "#383a42", com: "#a0a1a7", kw: "#a04098",
			str: "#50a020", fn: "#4078f2", param: "#0190a0", type: "#b83a3a", num: "#a86a00",
		},
		chips: ["#c678dd", "#98c379", "#d19a66", "#61afef", "#a04098", "#50a020"],
	},
	{
		name: "rose-pine",
		dark: {
			bg: "#191724", fg: "#e0def4", com: "#6e6a86", kw: "#eb6f92",
			str: "#9ccfd8", fn: "#31748f", param: "#ebbcba", type: "#c4a7e7", num: "#f6c177",
		},
		light: {
			bg: "#faf4ed", fg: "#575279", com: "#9893a5", kw: "#b4637a",
			str: "#286983", fn: "#56949f", param: "#d7827e", type: "#907aa9", num: "#ea9d34",
		},
		chips: ["#eb6f92", "#9ccfd8", "#f6c177", "#31748f", "#b4637a", "#286983"],
	},
	{
		name: "catppuccin",
		dark: {
			bg: "#1e1e2e", fg: "#cdd6f4", com: "#6c7086", kw: "#cba6f7",
			str: "#a6e3a1", fn: "#89b4fa", param: "#94e2d5", type: "#f9e2af", num: "#fab387",
		},
		light: {
			bg: "#eff1f5", fg: "#4c4f69", com: "#8c8fa1", kw: "#8839ef",
			str: "#40a02b", fn: "#1e66f5", param: "#179299", type: "#df8e1d", num: "#fe640b",
		},
		chips: ["#cba6f7", "#a6e3a1", "#fab387", "#89b4fa", "#8839ef", "#40a02b"],
	},
	{
		name: "ayu",
		dark: {
			bg: "#0a0e14", fg: "#b3b1ad", com: "#626a73", kw: "#ff8f40",
			str: "#c2d94c", fn: "#59c2ff", param: "#d2a6ff", type: "#59c2ff", num: "#e6b450",
		},
		light: {
			bg: "#fafafa", fg: "#5c6773", com: "#abb0b6", kw: "#fa8d3e",
			str: "#86b300", fn: "#3582aa", param: "#ed9366", type: "#f2ae49", num: "#a37acc",
		},
		chips: ["#ff8f40", "#c2d94c", "#e6b450", "#59c2ff", "#fa8d3e", "#86b300"],
	},
];
