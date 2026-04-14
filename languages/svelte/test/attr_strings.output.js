export const test = [
	{
		"type": "tag-boundary",
		"start": 0,
		"end": 1,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 1,
		"end": 4,
		"match": "div"
	},
	{
		"type": "attr-name",
		"start": 5,
		"end": 10,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 10,
		"end": 11,
		"match": "="
	},
	{
		"type": "string",
		"start": 11,
		"end": 16,
		"match": "\"foo "
	},
	{
		"type": "expression",
		"start": 16,
		"end": 17,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 17,
		"end": 20,
		"match": "bar"
	},
	{
		"type": "expression",
		"start": 20,
		"end": 21,
		"match": "}"
	},
	{
		"type": "string",
		"start": 21,
		"end": 26,
		"match": " baz\""
	},
	{
		"type": "tag-boundary",
		"start": 26,
		"end": 27,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 29,
		"end": 31,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 31,
		"end": 34,
		"match": "div"
	},
	{
		"type": "tag-boundary",
		"start": 34,
		"end": 35,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 36,
		"end": 37,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 37,
		"end": 40,
		"match": "img"
	},
	{
		"type": "attr-name",
		"start": 41,
		"end": 44,
		"match": "src"
	},
	{
		"type": "operator",
		"start": 44,
		"end": 45,
		"match": "="
	},
	{
		"type": "string",
		"start": 45,
		"end": 51,
		"match": "\"/img/"
	},
	{
		"type": "expression",
		"start": 51,
		"end": 52,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 52,
		"end": 54,
		"match": "id"
	},
	{
		"type": "expression",
		"start": 54,
		"end": 55,
		"match": "}"
	},
	{
		"type": "string",
		"start": 55,
		"end": 60,
		"match": ".png\""
	},
	{
		"type": "attr-name",
		"start": 61,
		"end": 64,
		"match": "alt"
	},
	{
		"type": "operator",
		"start": 64,
		"end": 65,
		"match": "="
	},
	{
		"type": "string",
		"start": 65,
		"end": 71,
		"match": "'icon-"
	},
	{
		"type": "expression",
		"start": 71,
		"end": 72,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 72,
		"end": 74,
		"match": "id"
	},
	{
		"type": "expression",
		"start": 74,
		"end": 75,
		"match": "}"
	},
	{
		"type": "string",
		"start": 75,
		"end": 76,
		"match": "'"
	},
	{
		"type": "tag-boundary",
		"start": 77,
		"end": 79,
		"match": "/>"
	},
	{
		"type": "tag-boundary",
		"start": 80,
		"end": 81,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 81,
		"end": 82,
		"match": "a"
	},
	{
		"type": "attr-name",
		"start": 83,
		"end": 88,
		"match": "title"
	},
	{
		"type": "operator",
		"start": 88,
		"end": 89,
		"match": "="
	},
	{
		"type": "string",
		"start": 89,
		"end": 96,
		"match": "\"plain\""
	},
	{
		"type": "attr-name",
		"start": 97,
		"end": 101,
		"match": "href"
	},
	{
		"type": "operator",
		"start": 101,
		"end": 102,
		"match": "="
	},
	{
		"type": "string",
		"start": 102,
		"end": 104,
		"match": "'/"
	},
	{
		"type": "expression",
		"start": 104,
		"end": 105,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 105,
		"end": 109,
		"match": "path"
	},
	{
		"type": "expression",
		"start": 109,
		"end": 110,
		"match": "}"
	},
	{
		"type": "string",
		"start": 110,
		"end": 115,
		"match": "/end'"
	},
	{
		"type": "tag-boundary",
		"start": 115,
		"end": 116,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 120,
		"end": 122,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 122,
		"end": 123,
		"match": "a"
	},
	{
		"type": "tag-boundary",
		"start": 123,
		"end": 124,
		"match": ">"
	}
];
