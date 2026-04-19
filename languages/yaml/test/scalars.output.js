export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 5,
		"match": "plain"
	},
	{
		"type": "punctuation",
		"start": 5,
		"end": 6,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 7,
		"end": 12,
		"match": "hello"
	},
	{
		"type": "identifier",
		"start": 13,
		"end": 18,
		"match": "world"
	},
	{
		"type": "property",
		"start": 19,
		"end": 25,
		"match": "double"
	},
	{
		"type": "punctuation",
		"start": 25,
		"end": 26,
		"match": ":"
	},
	{
		"type": "string",
		"start": 27,
		"end": 61,
		"match": "\"escaped \\\"quote\\\" and \\n newline\""
	},
	{
		"type": "property",
		"start": 62,
		"end": 68,
		"match": "single"
	},
	{
		"type": "punctuation",
		"start": 68,
		"end": 69,
		"match": ":"
	},
	{
		"type": "string",
		"start": 70,
		"end": 82,
		"match": "'it''s fine'"
	},
	{
		"type": "property",
		"start": 83,
		"end": 91,
		"match": "empty_dq"
	},
	{
		"type": "punctuation",
		"start": 91,
		"end": 92,
		"match": ":"
	},
	{
		"type": "string",
		"start": 93,
		"end": 95,
		"match": "\"\""
	},
	{
		"type": "property",
		"start": 96,
		"end": 104,
		"match": "empty_sq"
	},
	{
		"type": "punctuation",
		"start": 104,
		"end": 105,
		"match": ":"
	},
	{
		"type": "string",
		"start": 106,
		"end": 108,
		"match": "''"
	},
	{
		"type": "property",
		"start": 109,
		"end": 112,
		"match": "url"
	},
	{
		"type": "punctuation",
		"start": 112,
		"end": 113,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 114,
		"end": 138,
		"match": "https://example.com/path"
	},
	{
		"type": "property",
		"start": 139,
		"end": 143,
		"match": "path"
	},
	{
		"type": "punctuation",
		"start": 143,
		"end": 144,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 145,
		"end": 159,
		"match": "/usr/local/bin"
	},
	{
		"type": "property",
		"start": 160,
		"end": 165,
		"match": "regex"
	},
	{
		"type": "punctuation",
		"start": 165,
		"end": 166,
		"match": ":"
	},
	{
		"type": "string",
		"start": 167,
		"end": 177,
		"match": "'\\d+\\.\\d+'"
	},
	{
		"type": "property",
		"start": 178,
		"end": 192,
		"match": "embedded_colon"
	},
	{
		"type": "punctuation",
		"start": 192,
		"end": 193,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 194,
		"end": 201,
		"match": "foo:bar"
	},
	{
		"type": "property",
		"start": 202,
		"end": 215,
		"match": "hash_interior"
	},
	{
		"type": "punctuation",
		"start": 215,
		"end": 216,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 217,
		"end": 224,
		"match": "foo#bar"
	}
];
