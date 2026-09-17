import { browser } from '$app/environment';

// keep in sync with the inline script in app.html, which applies the
// stored mode to <html> before first paint.
const STATE_KEY = 'twinkleplop:mode';

export type theme_mode_value = 'system' | 'light' | 'dark';
export type resolved_mode = 'light' | 'dark';

function read_stored(): theme_mode_value {
	if (!browser) return 'system';
	try {
		const raw = localStorage.getItem(STATE_KEY);
		if (raw === 'system' || raw === 'light' || raw === 'dark') return raw;
	} catch {
		/* ignore */
	}
	return 'system';
}

function read_os(): resolved_mode {
	if (!browser) return 'dark';
	return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolve(value: theme_mode_value): resolved_mode {
	return value === 'system' ? read_os() : value;
}

// site css keys off `:root[data-mode]`, and theme packages switch their
// token vars on a `.dark` class, so both live on <html>.
function apply(mode: resolved_mode) {
	if (!browser) return;
	const root = document.documentElement;
	root.dataset.mode = mode;
	root.classList.toggle('dark', mode === 'dark');
	root.classList.toggle('light', mode === 'light');
}

const initial = read_stored();

export const theme_mode = $state<{
	value: theme_mode_value;
	resolved: resolved_mode;
}>({
	value: initial,
	resolved: resolve(initial)
});

// when the user picks "system", re-resolve as the os preference changes.
// listener lives for the client lifetime; the site has one such store.
if (browser) {
	const mql = window.matchMedia('(prefers-color-scheme: light)');
	mql.addEventListener('change', () => {
		if (theme_mode.value === 'system') {
			theme_mode.resolved = read_os();
			apply(theme_mode.resolved);
		}
	});
}

export function set_mode(value: theme_mode_value) {
	theme_mode.value = value;
	theme_mode.resolved = resolve(value);
	apply(theme_mode.resolved);
	if (!browser) return;
	try {
		localStorage.setItem(STATE_KEY, value);
	} catch {
		/* ignore */
	}
}

export function hydrate_mode() {
	const stored = read_stored();
	theme_mode.value = stored;
	theme_mode.resolved = resolve(stored);
	apply(theme_mode.resolved);
}
