export const test = [
	{
		"type": "heading-marker",
		"start": 0,
		"end": 1,
		"match": "#"
	},
	{
		"type": "heading",
		"start": 1,
		"end": 16,
		"match": " Project Readme"
	},
	{
		"type": "bold",
		"start": 26,
		"end": 28,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 28,
		"end": 33,
		"match": "intro"
	},
	{
		"type": "bold",
		"start": 33,
		"end": 35,
		"match": "**"
	},
	{
		"type": "link-text",
		"start": 53,
		"end": 54,
		"match": "["
	},
	{
		"type": "link-text",
		"start": 54,
		"end": 58,
		"match": "link"
	},
	{
		"type": "link-text",
		"start": 58,
		"end": 59,
		"match": "]"
	},
	{
		"type": "url-link",
		"start": 59,
		"end": 60,
		"match": "("
	},
	{
		"type": "url",
		"start": 60,
		"end": 79,
		"match": "https://example.com"
	},
	{
		"type": "url-link",
		"start": 79,
		"end": 80,
		"match": ")"
	},
	{
		"type": "code",
		"start": 85,
		"end": 86,
		"match": "`"
	},
	{
		"type": "code",
		"start": 86,
		"end": 97,
		"match": "inline code"
	},
	{
		"type": "code",
		"start": 97,
		"end": 98,
		"match": "`"
	},
	{
		"type": "heading-marker",
		"start": 101,
		"end": 103,
		"match": "##"
	},
	{
		"type": "heading",
		"start": 103,
		"end": 111,
		"match": " Install"
	},
	{
		"type": "code-fence",
		"start": 113,
		"end": 116,
		"match": "```"
	},
	{
		"type": "code-language",
		"start": 116,
		"end": 120,
		"match": "bash"
	},
	{
		"type": "raw_code_block",
		"start": 120,
		"end": 134,
		"match": "\npnpm install\n"
	},
	{
		"type": "code-fence",
		"start": 134,
		"end": 138,
		"match": "```\n"
	},
	{
		"type": "heading-marker",
		"start": 139,
		"end": 141,
		"match": "##"
	},
	{
		"type": "heading",
		"start": 141,
		"end": 150,
		"match": " Features"
	},
	{
		"type": "list-marker",
		"start": 152,
		"end": 154,
		"match": "- "
	},
	{
		"type": "list-marker",
		"start": 159,
		"end": 161,
		"match": "- "
	},
	{
		"type": "bold",
		"start": 161,
		"end": 163,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 163,
		"end": 167,
		"match": "bold"
	},
	{
		"type": "bold",
		"start": 167,
		"end": 169,
		"match": "**"
	},
	{
		"type": "list-marker",
		"start": 178,
		"end": 180,
		"match": "- "
	},
	{
		"type": "task-marker",
		"start": 180,
		"end": 184,
		"match": "[ ] "
	},
	{
		"type": "blockquote-marker",
		"start": 198,
		"end": 199,
		"match": ">"
	},
	{
		"type": "hr",
		"start": 222,
		"end": 226,
		"match": "---\n"
	},
	{
		"type": "autolink",
		"start": 231,
		"end": 232,
		"match": "<"
	},
	{
		"type": "autolink",
		"start": 232,
		"end": 251,
		"match": "https://example.com"
	},
	{
		"type": "autolink",
		"start": 251,
		"end": 252,
		"match": ">"
	}
];
