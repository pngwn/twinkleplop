import { error, redirect } from "@sveltejs/kit";

export const load = async ({ params, parent }) => {
  const { lang, test } = params;
  const { sources } = await parent();
  if (!sources.some(([name]) => name === test)) {
    // a sample name another language has or a stale link lands on the demo
    if (!sources.some(([name]) => name === "demo")) error(404, `no samples for ${lang}`);
    redirect(307, `/explore/${lang}/demo`);
  }
  return { lang, test };
};
