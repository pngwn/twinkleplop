import fs from 'node:fs';
import path from 'node:path';
import { type Grammar } from '@twinkleplop/core';

const lang_map = new Map([
	[
		'css',
		{
			grammar: () => import('@twinkleplop/css'),
			test: () => import('@twinkleplop/css/test')
		}
	]
]);
const test = fs.readdirSync(
	path.join(import.meta.dirname, '..', '..', '..', '..', '..', 'css', 'test')
);
console.log(test);

const css_files = test
	.filter((file) => file.endsWith('.css'))
	.map((file) => [
		file.replace('.css', ''),
		fs.readFileSync(
			path.join(import.meta.dirname, '..', '..', '..', '..', '..', 'css', 'test', file),
			'utf-8'
		)
	]);

console.log(css_files);

export const load = async ({ params }) => {
	const { lang, test } = params;
	// console.log(lang);
	if (!lang_map.get(lang)) {
		throw new Error(`Language ${lang} not found`);
	}
	const mod = await lang_map.get(lang)?.grammar();
	const test_module = await lang_map.get(lang)?.test();
	console.log(test, lang, test_module);
	return {
		css_files,
		lang,
		grammar: mod?.grammar,
		raw_grammar: mod?.raw_grammar as Grammar,
		test
	};
};
