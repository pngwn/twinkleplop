import { redirect } from '@sveltejs/kit';

// Per-language default test file for `/explore/<lang>` without a test param.
// Each entry points to a real fixture name in `packages/<lang>/test/`.
const DEFAULTS: Record<string, string> = {
	whitespace: 'whitespace_css',
	html: 'embedded'
};

export const load = async ({ params }) => {
	const defaultTest = DEFAULTS[params.lang] ?? 'at_rules';
	throw redirect(302, `${params.lang}/${defaultTest}`);
};
