import { redirect } from "@sveltejs/kit";
import { list_samples } from "$lib/server/explore_samples";

// the demo snippet doubles as the landing sample for `/explore/<lang>`.
export const load = async ({ params }) => {
  redirect(302, `/explore/${params.lang}/demo`);
};

// enumerate every language for the prerenderer. the crawler can only reach
// /explore/svelte from the homepage link; the other languages are switched
// to via client-side goto() and would otherwise be missed.
export const entries = () =>
  Object.entries(list_samples())
    .filter(([, tests]) => tests.includes("demo"))
    .map(([lang]) => ({ lang }));
