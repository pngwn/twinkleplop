import { describe, it, expect } from "vitest";
import { tokenize } from "./tokenizer.js";
import { compile } from "./compiler.js";
import { to_html } from "./generator.js";

describe("HTML Generator", () => {
	const grammar = {
		name: "test",
		states: {
			main: {
				rules: [
					{ match: "//", token: "comment", state: "line_comment" },
					{ match: '"', token: "string", state: "string" },
					{ match: ["function", "const", "let", "var"], token: "keyword" },
					{ range: ["0", "9"], token: "number" },
					{ range: ["a", "z"], token: "identifier" },
					{ range: ["A", "Z"], token: "identifier" },
					{ match: "_", token: "identifier" },
					{ match: " ", token: "whitespace" },
					{ match: "\t", token: "whitespace" },
					{ match: "\n", token: "whitespace" },
					{ match: "\r", token: "whitespace" },
					{ match: "(", token: "punctuation" },
					{ match: ")", token: "punctuation" },
					{ match: "{", token: "punctuation" },
					{ match: "}", token: "punctuation" },
					{ match: ";", token: "punctuation" },
					{ match: "=", token: "punctuation" },
				],
			},
			line_comment: {
				rules: [
					{ match: "\n", exit: true },
					{ range: [32, 126], token: "comment" },
					{ match: "\t", token: "comment" },
				],
			},
			string: {
				rules: [
					{ match: '"', token: "string", exit: true },
					{ range: [32, 126], token: "string" },
				],
			},
		},
	};

	const compiled = compile(grammar);

	it.skip("should generate basic HTML", () => {
		const input = "const x = 42;";
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens);

		expect(html).toContain('<pre class="highlight">');
		expect(html).toContain('<span class="keyword">const</span>');
		expect(html).toContain('<span class="number">42</span>');
	});

	it("should handle multi-line code", () => {
		const input = `function test() {
	// comment
	return "hello";
}`;
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens);

		expect(html).toContain('<span class="keyword">function</span>');
		expect(html).toContain('<span class="comment">// comment</span>');
		expect(html).toContain('<span class="string">&quot;hello&quot;</span>');

		// Check that newlines are preserved
		const lines = html.match(/<code>(.*?)<\/code>/s)[1].split("\n");
		expect(lines).toHaveLength(4);
	});

	it("should escape HTML characters", () => {
		const input = 'const html = "<div>&</div>";';
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens);

		expect(html).toContain("&lt;div&gt;&amp;&lt;/div&gt;");
		expect(html).not.toContain("<div>");
	});

	it("should support line numbers", () => {
		const input = `line 1
line 2
line 3`;
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens, { line_numbers: true });

		console.log(html);

		expect(html).toContain('<span class="line-number">1</span>');
		expect(html).toContain('<span class="line-number">2</span>');
		expect(html).toContain('<span class="line-number">3</span>');
		expect(html).toContain('<span class="line-content">');
	});

	it("should handle custom class names", () => {
		const input = "const x = 42;";
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens, { class_name: "my-code" });

		expect(html).toContain('<pre class="my-code">');
	});

	it("should handle tokens spanning multiple lines", () => {
		const grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "/*", token: "comment", state: "block_comment" }],
				},
				block_comment: {
					rules: [
						{ match: "*/", token: "comment", exit: true },
						{ match: "*", token: "comment" },
						{ match: "\n", token: "comment" },
						{ range: [32, 126], token: "comment" },
						{ match: "\t", token: "comment" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const input = `/* This is
a multi-line
comment */`;
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens);

		console.log(html);

		// Check that the comment spans are properly closed on each line
		const lines = html.match(/<code>(.*?)<\/code>/s)[1].split("\n");
		expect(lines[0]).toContain('<span class="comment">/* This is</span>');
		expect(lines[1]).toContain('<span class="comment">a multi-line</span>');
		expect(lines[2]).toContain('<span class="comment">comment */</span>');
	});

	it("should handle untokenized content", () => {
		const grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ range: ["a", "z"], token: "word" }],
				},
			},
		};

		const compiled = compile(grammar);
		const input = "hello 123 world";
		const tokens = tokenize(input, compiled);
		const html = to_html(input, tokens);

		expect(html).toContain('<span class="word">hello</span>');
		expect(html).toContain(" 123 ");
		expect(html).toContain('<span class="word">world</span>');
	});
});
