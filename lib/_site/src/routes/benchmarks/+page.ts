import { redirect } from "@sveltejs/kit";

// the page moved into the docs shell. old links keep working.
export const load = () => {
	redirect(301, "/docs/benchmarks");
};
