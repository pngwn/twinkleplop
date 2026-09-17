import { error, redirect } from "@sveltejs/kit";
import { list_samples, read_samples } from "$lib/server/explore_samples";

export const load = async ({ params }) => {
  const { lang, test } = params;
  const samples = read_samples(lang);
  if (!samples.some(([name]) => name === test)) {
    // a sample name that another language has, or a stale link: land on the
    // demo rather than an empty editor.
    if (!samples.some(([name]) => name === "demo")) error(404, `no samples for ${lang}`);
    redirect(307, `/explore/${lang}/demo`);
  }
  return {
    css_files: samples,
    lang,
    test,
  };
};

// enumerate every (lang, test) pair so the static prerender captures all
// combinations. the page navigates between them via goto(), so the
// crawler on its own only reaches /explore/<lang>/demo.
export const entries = () =>
  Object.entries(list_samples()).flatMap(([lang, tests]) => tests.map((test) => ({ lang, test })));
