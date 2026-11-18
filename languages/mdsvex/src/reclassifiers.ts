// svelte runs first, composition renames tokens and the embed finds bodies by type

import type { LanguagePipeline } from "@twinkleplop/core";
import { reclassifiers as markdown } from "@twinkleplop/markdown";
import { reclassifiers as svelte } from "@twinkleplop/svelte";

export const reclassifiers: LanguagePipeline = [...svelte, ...markdown];
