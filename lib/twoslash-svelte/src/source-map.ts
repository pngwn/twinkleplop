// Build a @volar/language-core SourceMap from svelte2tsx's magic-string VLQ
// mappings, so positions can be converted in both directions between the
// original Svelte source and the generated TSX.
//
// Ported from twoslashes/twoslash#57 by Hugos68 — same algorithm, JS
// instead of TS.
//
// The svelte2tsx map tracks identifier-level spans, not per-character.
// Because of that, we walk each "mapped" run forward only as long as the
// characters in the source and the characters in the generated code
// literally match (they always do for identifiers that were copied
// verbatim). This gives us the largest safely-mapped window, which we
// then record as a CodeMapping. Adjacent runs that line up get coalesced
// into a single CodeMapping so the resulting SourceMap is compact.

import { SourceMap, type CodeMapping } from "@volar/language-core";
import { decode } from "@jridgewell/sourcemap-codec";
import { createPositionConverter } from "twoslash-protocol";

export function generate_source_map(source_code: string, generated_code: string, encoded_mappings: string): SourceMap {
	// In the PR the converter names look swapped relative to their args.
	// They are correct: `sourcePositionConverter` is used to turn
	// (genLine, genChar) into a flat offset *inside the generated code*,
	// and `generatedPositionConverter` does the same for the source code.
	// The naming is backwards because magic-string's map reports (line,
	// character) positions in the generated file for the "generated" slot
	// and in the source file for the "source" slot. We keep the original
	// names to make diff-hunting against the upstream PR easier.
	const source_position_converter = createPositionConverter(generated_code);
	const generated_position_converter = createPositionConverter(source_code);
	const decoded_mappings = decode(encoded_mappings);
	const mappings: CodeMapping[] = [];

	let current: { gen_offset: number, source_offset: number } | undefined;

	for (let gen_line = 0; gen_line < decoded_mappings.length; gen_line++) {
		for (const segment of decoded_mappings[gen_line]) {
			const gen_character = segment[0];
			const gen_offset = source_position_converter.posToIndex(
				gen_line,
				gen_character,
			);
			if (current) {
				// Candidate mapping: [current.sourceOffset, current.genOffset)
				// to [sourceOffset + len, genOffset). Shrink the length to
				// the longest prefix where source and generated characters
				// agree — anywhere svelte2tsx inserted wrapper code they
				// will diverge.
				let length = gen_offset - current.gen_offset;
				const source_text = source_code.substring(
					current.source_offset,
					current.source_offset + length,
				);
				const gen_text = generated_code.substring(
					current.gen_offset,
					current.gen_offset + length,
				);
				if (source_text !== gen_text) {
					length = 0;
					for (let i = 0; i < gen_offset - current.gen_offset; i++) {
						if (source_text[i] === gen_text[i]) {
							length = i + 1;
						} else {
							break;
						}
					}
				}
				if (length > 0) {
					// Coalesce with the previous mapping if it sits flush
					// against this one in both source and generated space.
					const last_mapping = mappings.length
						? mappings[mappings.length - 1]
						: undefined;
					if (
						last_mapping &&
						last_mapping.generatedOffsets[0] + last_mapping.lengths[0] ===
							current.gen_offset &&
						last_mapping.sourceOffsets[0] + last_mapping.lengths[0] ===
							current.source_offset
					) {
						last_mapping.lengths[0] += length;
					} else {
						mappings.push({
							sourceOffsets: [current.source_offset],
							generatedOffsets: [current.gen_offset],
							lengths: [length],
							data: {
								verification: true,
								completion: true,
								semantic: true,
								navigation: true,
								structure: true,
								format: false,
							},
						});
					}
				}
				current = undefined;
			}
			if (segment[2] !== undefined && segment[3] !== undefined) {
				const source_offset = generated_position_converter.posToIndex(
					segment[2],
					segment[3],
				);
				current = { gen_offset, source_offset };
			}
		}
	}

	return new SourceMap(mappings);
}
