import { redirect } from '@sveltejs/kit';

export const load = async ({ params }) => {
	if (params.lang === 'whitespace') {
		throw redirect(302, `${params.lang}/whitespace_css`);
	}
	throw redirect(302, `${params.lang}/at_rules`);
};
