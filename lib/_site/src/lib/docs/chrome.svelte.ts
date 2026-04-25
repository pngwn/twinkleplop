import { browser } from '$app/environment';

const STATE_KEY = 'twinkledocs:state';

type tweak_state = {
	density: 'compact' | 'cozy' | 'comfortable';
	nav: 'tree' | 'grouped' | 'manpage';
	crt: 'on' | 'off';
};

const DEFAULTS: tweak_state = {
	density: 'cozy',
	nav: 'manpage',
	crt: 'on'
};

function load_state(): tweak_state {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STATE_KEY);
		if (!raw) return { ...DEFAULTS };
		return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULTS };
	}
}

function save_state(s: tweak_state) {
	if (!browser) return;
	try {
		localStorage.setItem(STATE_KEY, JSON.stringify(s));
	} catch {
		/* ignore */
	}
}

export const chrome = $state({
	tweaks: load_state(),
	palette_open: false,
	tweaks_open: false,
	nav_open: false,
	hydrated: false
});

export function hydrate_from_storage() {
	const loaded = load_state();
	chrome.tweaks = loaded;
	chrome.hydrated = true;
}

export function set_tweak<K extends keyof tweak_state>(key: K, value: tweak_state[K]) {
	chrome.tweaks = { ...chrome.tweaks, [key]: value };
	save_state(chrome.tweaks);
}

export function open_palette() {
	chrome.palette_open = true;
}

export function close_palette() {
	chrome.palette_open = false;
}

export function toggle_nav() {
	chrome.nav_open = !chrome.nav_open;
}

export function close_nav() {
	chrome.nav_open = false;
}

export function toggle_tweaks() {
	chrome.tweaks_open = !chrome.tweaks_open;
}

export function close_tweaks() {
	chrome.tweaks_open = false;
}
