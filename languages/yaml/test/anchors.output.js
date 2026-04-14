export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 6,
		"match": "server"
	},
	{
		"type": "punctuation",
		"start": 6,
		"end": 7,
		"match": ":"
	},
	{
		"type": "anchor",
		"start": 8,
		"end": 16,
		"match": "&default"
	},
	{
		"type": "property",
		"start": 19,
		"end": 23,
		"match": "host"
	},
	{
		"type": "punctuation",
		"start": 23,
		"end": 24,
		"match": ":"
	},
	{
		"type": "plain_scalar",
		"start": 25,
		"end": 34,
		"match": "localhost"
	},
	{
		"type": "property",
		"start": 37,
		"end": 41,
		"match": "port"
	},
	{
		"type": "punctuation",
		"start": 41,
		"end": 42,
		"match": ":"
	},
	{
		"type": "number",
		"start": 43,
		"end": 47,
		"match": "8080"
	},
	{
		"type": "property",
		"start": 48,
		"end": 54,
		"match": "backup"
	},
	{
		"type": "punctuation",
		"start": 54,
		"end": 55,
		"match": ":"
	},
	{
		"type": "alias",
		"start": 56,
		"end": 64,
		"match": "*default"
	},
	{
		"type": "property",
		"start": 65,
		"end": 71,
		"match": "tagged"
	},
	{
		"type": "punctuation",
		"start": 71,
		"end": 72,
		"match": ":"
	},
	{
		"type": "tag",
		"start": 73,
		"end": 78,
		"match": "!!str"
	},
	{
		"type": "string",
		"start": 79,
		"end": 86,
		"match": "\"hello\""
	},
	{
		"type": "property",
		"start": 87,
		"end": 97,
		"match": "custom_tag"
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 98,
		"match": ":"
	},
	{
		"type": "tag",
		"start": 99,
		"end": 112,
		"match": "!myapp/widget"
	},
	{
		"type": "number",
		"start": 113,
		"end": 115,
		"match": "42"
	},
	{
		"type": "property",
		"start": 116,
		"end": 128,
		"match": "verbatim_tag"
	},
	{
		"type": "punctuation",
		"start": 128,
		"end": 129,
		"match": ":"
	},
	{
		"type": "tag",
		"start": 130,
		"end": 157,
		"match": "!<tag:example.com,2024:foo>"
	},
	{
		"type": "plain_scalar",
		"start": 158,
		"end": 163,
		"match": "value"
	},
	{
		"type": "property",
		"start": 164,
		"end": 176,
		"match": "named_handle"
	},
	{
		"type": "punctuation",
		"start": 176,
		"end": 177,
		"match": ":"
	},
	{
		"type": "tag",
		"start": 178,
		"end": 188,
		"match": "!e!special"
	},
	{
		"type": "plain_scalar",
		"start": 189,
		"end": 193,
		"match": "data"
	}
];
