import { describe, expect, it } from 'vitest';
import { build_example } from './model';

describe('explainer example', () => {
	it('keeps every part of the escaped string in one span', () => {
		const data = build_example();
		expect(data.source).toHaveLength(7);
		expect(data.token_types).toEqual(['string']);
		expect(data.tokens).toEqual([0, 0, 7]);
		expect(data.prefixes[5]).toEqual([0, 0, 5]);
	});
	it('uses actual generated states and the opening quote instruction', () => {
		const data = build_example();
		expect(data.states.map((s) => [s.label, s.id])).toEqual([
			['root', 0],
			['escape', 1],
			['inside', 2]
		]);
		expect(data.quote_rule).toBe(0);
		expect(data.action).toEqual([2, 0, 1]);
		expect(data.quote_map.filter((entry) => entry.rule !== 65535)).toEqual([{ code: 34, rule: 0 }]);
	});
});
