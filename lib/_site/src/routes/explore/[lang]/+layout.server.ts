import { error } from "@sveltejs/kit";
import { read_samples } from "$lib/server/explore_samples";

// every sample of a language in a load that only reads lang, so moving
// between its samples makes no request
export const load = async ({ params }) => {
  const sources = read_samples(params.lang);
  if (sources.length === 0) error(404, `no samples for ${params.lang}`);
  return { sources };
};
