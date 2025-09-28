import fs from 'node:fs';
import path from 'node:path';
import { type Grammar, type TokenizeResult, tokenize } from '@twinkleplop/core';

const lang_map = new Map([
	[
		'css',
		{
			grammar: () => import('@twinkleplop/css'),
			test: () => import('@twinkleplop/css/test')
		}
	],
	[
		'whitespace',
		{
			grammar: () => import('@twinkleplop/whitespace'),
			test: () => import('@twinkleplop/whitespace/test')
		}
	],
	[
		'clike',
		{
			grammar: () => import('@twinkleplop/clike'),
			test: () => import('@twinkleplop/clike/test')
		}
	],
	[
		'javascript',
		{
			grammar: () => import('@twinkleplop/javascript'),
			test: () => import('@twinkleplop/javascript/test')
		}
	]
]);

function getTestFiles(lang: string) {
	const test = fs.readdirSync(
		path.join(import.meta.dirname, '..', '..', '..', '..', '..', '..', lang, 'test')
	);

	const css_files = test
		.filter((file) => !file.endsWith('.js'))
		.map((file) => [
			file.replace('.css', ''),
			fs.readFileSync(
				path.join(import.meta.dirname, '..', '..', '..', '..', '..', '..', lang, 'test', file),
				'utf-8'
			)
		]);

	return css_files;
}

export const load = async ({ params }) => {
	const { lang, test } = params;
	// console.log(lang);
	if (!lang_map.get(lang)) {
		throw new Error(`Language ${lang} not found`);
	}
	const mod = await lang_map.get(lang)?.grammar();
	// const test_module = await lang_map.get(lang)?.test();
	const test_files = getTestFiles(lang);

	console.log(test_files);
	// const transform = lang_map.get(lang)?.transform;
	// console.log(transform);
	// console.log(tokenize('div { transform: translate(10px, 20px); }', mod?.grammar));
	return {
		css_files: test_files,
		lang,
		grammar: mod?.grammar,
		raw_grammar: mod?.raw_grammar as Grammar,
		test,
		allLanguages: Array.from(lang_map.keys())
	};
};
