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
		"end": 6,
		"match": "style"
	},
	{
		"type": "tag-boundary",
		"start": 6,
		"end": 7,
		"match": ">"
	},
	{
		"type": "raw_style",
		"start": 7,
		"end": 24,
		"match": "p { color: red; }"
	},
	{
		"type": "tag-boundary",
		"start": 24,
		"end": 26,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 26,
		"end": 31,
		"match": "style"
	},
	{
		"type": "tag-boundary",
		"start": 31,
		"end": 32,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 33,
		"end": 34,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 34,
		"end": 39,
		"match": "style"
	},
	{
		"type": "attr-name",
		"start": 40,
		"end": 44,
		"match": "lang"
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
		"match": "\"scss\""
	},
	{
		"type": "tag-boundary",
		"start": 51,
		"end": 52,
		"match": ">"
	},
	{
		"type": "raw_style",
		"start": 52,
		"end": 78,
		"match": ".a { .b { color: blue; } }"
	},
	{
		"type": "tag-boundary",
		"start": 78,
		"end": 80,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 80,
		"end": 85,
		"match": "style"
	},
	{
		"type": "tag-boundary",
		"start": 85,
		"end": 86,
		"match": ">"
	}
];
