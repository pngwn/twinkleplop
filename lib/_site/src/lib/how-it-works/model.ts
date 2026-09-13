import { compile } from '@twinkleplop/core/compile';
import { tokenize } from '@twinkleplop/core';

// One helper is enough to show state expansion, compilation, and stack semantics.
export const example = {
	name: 'one quoted string',
	states: {
		root: {
			rules: [{ match_within: { start: '"', end: '"', escape: '\\' }, token: 'string' }]
		}
	}
};
export const source = '"hi\\"!"';

export function build_example() {
	const compiled = compile(example);
	const result = tokenize(source, compiled);
	const states = [...compiled.states].map(([name, id]) => ({
		id,
		name,
		label: name === 'root' ? 'root' : name.endsWith('_escape') ? 'escape' : 'inside'
	}));
	const quote_rule = compiled.char_maps[34];
	const action = Array.from(compiled.transitions.slice(quote_rule * 3, quote_rule * 3 + 3));
	const quote_map = Array.from({ length: 8 }, (_, i) => ({
		code: i + 32,
		rule: compiled.char_maps[i + 32]
	}));
	const prefixes = Array.from({ length: source.length + 1 }, (_, end) =>
		Array.from(tokenize(source.slice(0, end), compiled).tokens)
	);
	return {
		source,
		states,
		quote_rule,
		action,
		quote_map,
		prefixes,
		tokens: Array.from(result.tokens),
		token_types: result.token_types
	};
}
