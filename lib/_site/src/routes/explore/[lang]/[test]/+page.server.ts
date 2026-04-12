import fs from 'node:fs';
import path from 'node:path';
import { type Grammar, type TokenizeResult, tokenize } from '@twinkleplop/core';



function get_test_files(lang: string) {
	const test = fs.readdirSync(
		path.join(import.meta.dirname, '..', '..', '..', '..', '..', '..', lang, 'test')
	);

	const css_files = test
		// .js files are snapshot outputs for assertion tests, not input fixtures.
		.filter((file) => !file.endsWith('.js'))
		.map((file) => [
			// Strip the last file extension (`.css`, `.html`, `.txt`, ...) so the
			// URL-facing test name is just the basename.
			file.replace(/\.[^.]+$/, ''),
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

	// const test_module = await lang_map.get(lang)?.test();
	const test_files = get_test_files(lang);

	console.log(test_files);
	// const transform = lang_map.get(lang)?.transform;
	// console.log(transform);
	// console.log(tokenize('div { transform: translate(10px, 20px); }', mod?.grammar));
	return {
		css_files: test_files,
		lang,


		test,

	};
};
