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
		"end": 7,
		"match": "script"
	},
	{
		"type": "tag-boundary",
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
		"type": "tag-boundary",
		"start": 18,
		"end": 20,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 20,
		"end": 26,
		"match": "script"
	},
	{
		"type": "tag-boundary",
		"start": 26,
		"end": 27,
		"match": ">"
	},
	{
		"type": "tag-boundary",
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
		"type": "tag-boundary",
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
		"type": "tag-boundary",
		"start": 64,
		"end": 66,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 66,
		"end": 72,
		"match": "script"
	},
	{
		"type": "tag-boundary",
		"start": 72,
		"end": 73,
		"match": ">"
	},
	{
		"type": "tag-boundary",
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
		"type": "tag-boundary",
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
		"type": "tag-boundary",
		"start": 108,
		"end": 110,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 110,
		"end": 116,
		"match": "script"
	},
	{
		"type": "tag-boundary",
		"start": 116,
		"end": 117,
		"match": ">"
	}
];
