export const chrome = $state({
	palette_open: false,
	nav_open: false
});

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
