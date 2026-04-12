import { redirect } from '@sveltejs/kit';

// Per-language default test file for `/explore/<lang>` without a test param.
// Each entry points to a real fixture name in `packages/<lang>/test/`.
const DEFAULTS: Record<string, string> = {
	whitespace: 'whitespace_css',
	html: 'embedded',
	svelte: 'counter'
};

export const load = async ({ params }) => {
	const default_test = DEFAULTS[params.lang] ?? 'at_rules';
	throw redirect(302, `${params.lang}/${default_test}`);
};
