import { list_samples } from "$lib/server/explore_samples";

// enumerate every (lang, test) pair so the static prerender captures all
// combinations. the page navigates between them via goto(), so the
// crawler on its own only reaches /explore/<lang>/demo.
export const entries = () =>
  Object.entries(list_samples()).flatMap(([lang, tests]) => tests.map((test) => ({ lang, test })));
