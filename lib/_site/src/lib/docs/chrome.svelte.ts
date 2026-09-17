export const chrome = $state({
	nav_open: false
});

export function toggle_nav() {
	chrome.nav_open = !chrome.nav_open;
}

export function close_nav() {
	chrome.nav_open = false;
}
