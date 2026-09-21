export const test = [
	{
		"type": "property",
		"start": 1,
		"end": 6,
		"match": "FIRST"
	},
	{
		"type": "operator",
		"start": 6,
		"end": 7,
		"match": "="
	},
	{
		"type": "number",
		"start": 7,
		"end": 8,
		"match": "1"
	},
	{
		"type": "comment",
		"start": 10,
		"end": 24,
		"match": "# crlf comment"
	},
	{
		"type": "property",
		"start": 26,
		"end": 34,
		"match": "UNQUOTED"
	},
	{
		"type": "operator",
		"start": 34,
		"end": 35,
		"match": "="
	},
	{
		"type": "string",
		"start": 35,
		"end": 41,
		"match": "value "
	},
	{
		"type": "comment",
		"start": 41,
		"end": 44,
		"match": "# c"
	},
	{
		"type": "property",
		"start": 46,
		"end": 52,
		"match": "QUOTED"
	},
	{
		"type": "operator",
		"start": 52,
		"end": 53,
		"match": "="
	},
	{
		"type": "string",
		"start": 53,
		"end": 59,
		"match": "\"a\r\nb\""
	},
	{
		"type": "property",
		"start": 61,
		"end": 67,
		"match": "NUMBER"
	},
	{
		"type": "operator",
		"start": 67,
		"end": 68,
		"match": "="
	},
	{
		"type": "number",
		"start": 68,
		"end": 70,
		"match": "42"
	},
	{
		"type": "property",
		"start": 72,
		"end": 76,
		"match": "BARE"
	}
];
