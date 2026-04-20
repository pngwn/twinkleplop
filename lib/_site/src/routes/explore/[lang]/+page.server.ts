import { redirect } from '@sveltejs/kit';

// every language ships a "demo" snippet under
// lib/_site/src/lib/explore/demos/<lang>.<ext> that exercises most token
// types. it doubles as the landing sample for `/explore/<lang>`.
export const load = async ({ params }) => {
	throw redirect(302, `${params.lang}/demo`);
};
