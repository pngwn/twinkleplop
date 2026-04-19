export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "string",
		"start": 4,
		"end": 12,
		"match": "\"simple\""
	},
	{
		"type": "punctuation",
		"start": 12,
		"end": 13,
		"match": ":"
	},
	{
		"type": "string",
		"start": 14,
		"end": 27,
		"match": "\"hello world\""
	},
	{
		"type": "punctuation",
		"start": 27,
		"end": 28,
		"match": ","
	},
	{
		"type": "string",
		"start": 31,
		"end": 46,
		"match": "\"escaped_quote\""
	},
	{
		"type": "punctuation",
		"start": 46,
		"end": 47,
		"match": ":"
	},
	{
		"type": "string",
		"start": 48,
		"end": 58,
		"match": "\"she said "
	},
	{
		"type": "string_escape",
		"start": 58,
		"end": 60,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 60,
		"end": 62,
		"match": "hi"
	},
	{
		"type": "string_escape",
		"start": 62,
		"end": 64,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 64,
		"end": 65,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 65,
		"end": 66,
		"match": ","
	},
	{
		"type": "string",
		"start": 69,
		"end": 80,
		"match": "\"backslash\""
	},
	{
		"type": "punctuation",
		"start": 80,
		"end": 81,
		"match": ":"
	},
	{
		"type": "string",
		"start": 82,
		"end": 87,
		"match": "\"path"
	},
	{
		"type": "string_escape",
		"start": 87,
		"end": 89,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 89,
		"end": 91,
		"match": "to"
	},
	{
		"type": "string_escape",
		"start": 91,
		"end": 93,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 93,
		"end": 98,
		"match": "file\""
	},
	{
		"type": "punctuation",
		"start": 98,
		"end": 99,
		"match": ","
	},
	{
		"type": "string",
		"start": 102,
		"end": 111,
		"match": "\"unicode\""
	},
	{
		"type": "punctuation",
		"start": 111,
		"end": 112,
		"match": ":"
	},
	{
		"type": "string",
		"start": 113,
		"end": 114,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 114,
		"end": 132,
		"match": "\\u0041\\u0042\\u0043"
	},
	{
		"type": "string",
		"start": 132,
		"end": 133,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 133,
		"end": 134,
		"match": ","
	},
	{
		"type": "string",
		"start": 137,
		"end": 147,
		"match": "\"controls\""
	},
	{
		"type": "punctuation",
		"start": 147,
		"end": 148,
		"match": ":"
	},
	{
		"type": "string",
		"start": 149,
		"end": 155,
		"match": "\"line1"
	},
	{
		"type": "string_escape",
		"start": 155,
		"end": 157,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 157,
		"end": 162,
		"match": "line2"
	},
	{
		"type": "string_escape",
		"start": 162,
		"end": 164,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 164,
		"end": 167,
		"match": "tab"
	},
	{
		"type": "string_escape",
		"start": 167,
		"end": 173,
		"match": "\\r\\b\\f"
	},
	{
		"type": "string",
		"start": 173,
		"end": 174,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 174,
		"end": 175,
		"match": ","
	},
	{
		"type": "string",
		"start": 178,
		"end": 185,
		"match": "\"slash\""
	},
	{
		"type": "punctuation",
		"start": 185,
		"end": 186,
		"match": ":"
	},
	{
		"type": "string",
		"start": 187,
		"end": 189,
		"match": "\"a"
	},
	{
		"type": "string_escape",
		"start": 189,
		"end": 191,
		"match": "\\/"
	},
	{
		"type": "string",
		"start": 191,
		"end": 193,
		"match": "b\""
	},
	{
		"type": "punctuation",
		"start": 193,
		"end": 194,
		"match": ","
	},
	{
		"type": "string",
		"start": 197,
		"end": 204,
		"match": "\"empty\""
	},
	{
		"type": "punctuation",
		"start": 204,
		"end": 205,
		"match": ":"
	},
	{
		"type": "string",
		"start": 206,
		"end": 208,
		"match": "\"\""
	},
	{
		"type": "punctuation",
		"start": 209,
		"end": 210,
		"match": "}"
	}
];
