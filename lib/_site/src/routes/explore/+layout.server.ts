import { list_samples } from "$lib/server/explore_samples";

// sample names per language, so switching language can keep the current
// sample when the new language has one of the same name and fall back to its
// demo otherwise. loaded once and reused across client-side navigation.
export const load = async () => ({ samples: list_samples() });
