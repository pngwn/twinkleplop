import { browser } from '$app/environment';

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
		}
	});
}

export function set_mode(value: theme_mode_value) {
	theme_mode.value = value;
	theme_mode.resolved = resolve(value);
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
}
