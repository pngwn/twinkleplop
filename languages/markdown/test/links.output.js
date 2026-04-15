export const test = [
	{
		"type": "link-text",
		"start": 0,
		"end": 1,
		"match": "["
	},
	{
		"type": "link-text",
		"start": 1,
		"end": 5,
		"match": "text"
	},
	{
		"type": "link-text",
		"start": 5,
		"end": 6,
		"match": "]"
	},
	{
		"type": "url-link",
		"start": 6,
		"end": 7,
		"match": "("
	},
	{
		"type": "url",
		"start": 7,
		"end": 26,
		"match": "https://example.com"
	},
	{
		"type": "url-link",
		"start": 26,
		"end": 27,
		"match": ")"
	},
	{
		"type": "link-text",
		"start": 29,
		"end": 30,
		"match": "["
	},
	{
		"type": "link-text",
		"start": 30,
		"end": 40,
		"match": "with title"
	},
	{
		"type": "link-text",
		"start": 40,
		"end": 41,
		"match": "]"
	},
	{
		"type": "url-link",
		"start": 41,
		"end": 42,
		"match": "("
	},
	{
		"type": "url",
		"start": 42,
		"end": 62,
		"match": "https://example.com "
	},
	{
		"type": "url-title",
		"start": 62,
		"end": 71,
		"match": "\"Example\""
	},
	{
		"type": "url-link",
		"start": 71,
		"end": 72,
		"match": ")"
	},
	{
		"type": "link-text",
		"start": 74,
		"end": 75,
		"match": "["
	},
	{
		"type": "link-text",
		"start": 75,
		"end": 84,
		"match": "reference"
	},
	{
		"type": "link-text",
		"start": 84,
		"end": 85,
		"match": "]"
	},
	{
		"type": "url-link",
		"start": 85,
		"end": 86,
		"match": "["
	},
	{
		"type": "url-reference",
		"start": 86,
		"end": 91,
		"match": "label"
	},
	{
		"type": "url-link",
		"start": 91,
		"end": 92,
		"match": "]"
	},
	{
		"type": "link-text",
		"start": 94,
		"end": 95,
		"match": "["
	},
	{
		"type": "link-text",
		"start": 95,
		"end": 108,
		"match": "just brackets"
	},
	{
		"type": "link-text",
		"start": 108,
		"end": 109,
		"match": "]"
	},
	{
		"type": "link-text",
		"start": 111,
		"end": 113,
		"match": "!["
	},
	{
		"type": "link-text",
		"start": 113,
		"end": 122,
		"match": "image alt"
	},
	{
		"type": "link-text",
		"start": 122,
		"end": 123,
		"match": "]"
	},
	{
		"type": "url-link",
		"start": 123,
		"end": 124,
		"match": "("
	},
	{
		"type": "url",
		"start": 124,
		"end": 133,
		"match": "image.png"
	},
	{
		"type": "url-link",
		"start": 133,
		"end": 134,
		"match": ")"
	},
	{
		"type": "autolink",
		"start": 140,
		"end": 141,
		"match": "<"
	},
	{
		"type": "autolink",
		"start": 141,
		"end": 158,
		"match": "https://auto.link"
	},
	{
		"type": "autolink",
		"start": 158,
		"end": 159,
		"match": ">"
	}
];
