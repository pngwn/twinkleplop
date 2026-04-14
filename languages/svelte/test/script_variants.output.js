export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 1,
		"end": 7,
		"match": "script"
	},
	{
		"type": "punctuation",
		"start": 7,
		"end": 8,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 8,
		"end": 18,
		"match": "let a = 1;"
	},
	{
		"type": "tag-name",
		"start": 18,
		"end": 27,
		"match": "</script>"
	},
	{
		"type": "punctuation",
		"start": 28,
		"end": 29,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 29,
		"end": 35,
		"match": "script"
	},
	{
		"type": "attr-name",
		"start": 36,
		"end": 40,
		"match": "lang"
	},
	{
		"type": "operator",
		"start": 40,
		"end": 41,
		"match": "="
	},
	{
		"type": "string",
		"start": 41,
		"end": 45,
		"match": "\"ts\""
	},
	{
		"type": "punctuation",
		"start": 45,
		"end": 46,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 46,
		"end": 64,
		"match": "let b: number = 2;"
	},
	{
		"type": "tag-name",
		"start": 64,
		"end": 73,
		"match": "</script>"
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 75,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 75,
		"end": 81,
		"match": "script"
	},
	{
		"type": "attr-name",
		"start": 82,
		"end": 88,
		"match": "module"
	},
	{
		"type": "punctuation",
		"start": 88,
		"end": 89,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 89,
		"end": 108,
		"match": "export const c = 3;"
	},
	{
		"type": "tag-name",
		"start": 108,
		"end": 117,
		"match": "</script>"
	}
];
