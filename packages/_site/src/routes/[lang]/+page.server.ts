import { redirect } from '@sveltejs/kit';

export const load = async ({ params }) => {
	throw redirect(302, `/${params.lang}/at_rules`);
};
