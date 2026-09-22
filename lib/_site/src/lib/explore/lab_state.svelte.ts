import { DEFAULT_VIEW, type lab_view } from "./themes";

// shared by every explore page so settings carry over to /explore/edit and back
export const view = $state<lab_view>({ ...DEFAULT_VIEW });

// enabled fidelity tags per language, missing or null means every tag
export const fidelity_by_lang = $state<Record<string, string[] | null>>({});
