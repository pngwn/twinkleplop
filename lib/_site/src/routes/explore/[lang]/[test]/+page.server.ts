import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter, type Highlighter } from 'shiki';

// project root -> languages/<lang>/test/
const PROJECT_ROOT = path.join(import.meta.dirname, '..', '..', '..', '..', '..', '..', '..');

const SHIKI_LANG_MAP: Record<string, string> = {
	css: 'css',
	javascript: 'javascript',
	html: 'html',
	svelte: 'svelte',
	rust: 'rust',
	typescript: 'typescript',
	sql: 'sql',
	yaml: 'yaml',
};

const SHIKI_LANGS = ['css', 'javascript', 'html', 'svelte', 'rust', 'typescript', 'sql', 'c', 'yaml'] as const;

let highlighter_promise: Promise<Highlighter> | null = null;

function get_highlighter(): Promise<Highlighter> {
	if (!highlighter_promise) {
		highlighter_promise = createHighlighter({
			themes: ['ayu-dark'],
			langs: [...SHIKI_LANGS]
		});
	}
	return highlighter_promise;
}

function get_test_files(lang: string) {
	const test_dir = path.join(PROJECT_ROOT, 'languages', lang, 'test');
	const test = fs.readdirSync(test_dir);

	const css_files = test
		// .js files are snapshot outputs for assertion tests, not input fixtures.
		.filter((file) => !file.endsWith('.js'))
		.map((file) => [
			// Strip the last file extension (`.css`, `.html`, `.txt`, ...) so the
			// URL-facing test name is just the basename.
			file.replace(/\.[^.]+$/, ''),
			fs.readFileSync(path.join(test_dir, file), 'utf-8')
		]);

	return css_files;
}

export const load = async ({ params }) => {
	const { lang, test } = params;

	const test_files = get_test_files(lang);
	const source = test_files.find(([file]) => file === test)?.[1];

	let shiki_html: string | null = null;
	const shiki_lang = SHIKI_LANG_MAP[lang];

	if (source && shiki_lang) {
		try {
			const highlighter = await get_highlighter();
			shiki_html = highlighter.codeToHtml(source, { lang: shiki_lang, theme: 'ayu-dark' });
		} catch (e) {
			console.error('Shiki highlight error:', e);
		}
	}

	return {
		css_files: test_files,
		lang,
		test,
		shiki_html
	};
};
