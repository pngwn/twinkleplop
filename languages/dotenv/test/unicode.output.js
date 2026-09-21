export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 4,
		"match": "ключ"
	},
	{
		"type": "operator",
		"start": 4,
		"end": 5,
		"match": "="
	},
	{
		"type": "string",
		"start": 5,
		"end": 13,
		"match": "значение"
	},
	{
		"type": "property",
		"start": 14,
		"end": 17,
		"match": "KEY"
	},
	{
		"type": "operator",
		"start": 17,
		"end": 18,
		"match": "="
	},
	{
		"type": "string",
		"start": 18,
		"end": 21,
		"match": "日本語"
	},
	{
		"type": "property",
		"start": 22,
		"end": 27,
		"match": "EMOJI"
	},
	{
		"type": "operator",
		"start": 27,
		"end": 28,
		"match": "="
	},
	{
		"type": "string",
		"start": 28,
		"end": 36,
		"match": "🎉 party"
	},
	{
		"type": "property",
		"start": 37,
		"end": 39,
		"match": "🔑"
	},
	{
		"type": "operator",
		"start": 39,
		"end": 40,
		"match": "="
	},
	{
		"type": "string",
		"start": 40,
		"end": 46,
		"match": "secret"
	},
	{
		"type": "property",
		"start": 47,
		"end": 55,
		"match": "GREETING"
	},
	{
		"type": "operator",
		"start": 55,
		"end": 56,
		"match": "="
	},
	{
		"type": "string",
		"start": 56,
		"end": 64,
		"match": "\"Grüße, "
	},
	{
		"type": "punctuation",
		"start": 64,
		"end": 66,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 66,
		"end": 70,
		"match": "NAME"
	},
	{
		"type": "punctuation",
		"start": 70,
		"end": 71,
		"match": "}"
	},
	{
		"type": "string",
		"start": 71,
		"end": 74,
		"match": "é!\""
	},
	{
		"type": "property",
		"start": 75,
		"end": 78,
		"match": "REF"
	},
	{
		"type": "operator",
		"start": 78,
		"end": 79,
		"match": "="
	},
	{
		"type": "variable",
		"start": 79,
		"end": 84,
		"match": "$NAME"
	},
	{
		"type": "string",
		"start": 84,
		"end": 85,
		"match": "é"
	},
	{
		"type": "property",
		"start": 86,
		"end": 97,
		"match": "AFTER_QUOTE"
	},
	{
		"type": "operator",
		"start": 97,
		"end": 98,
		"match": "="
	},
	{
		"type": "string",
		"start": 98,
		"end": 102,
		"match": "\"x\"é"
	},
	{
		"type": "property",
		"start": 103,
		"end": 107,
		"match": "junk"
	},
	{
		"type": "comment",
		"start": 115,
		"end": 124,
		"match": "# comment"
	},
	{
		"type": "comment",
		"start": 125,
		"end": 197,
		"match": "# a non-ASCII char after a number-looking start makes the value a string"
	},
	{
		"type": "property",
		"start": 198,
		"end": 203,
		"match": "PRICE"
	},
	{
		"type": "operator",
		"start": 203,
		"end": 204,
		"match": "="
	},
	{
		"type": "string",
		"start": 204,
		"end": 206,
		"match": "5€"
	},
	{
		"type": "property",
		"start": 207,
		"end": 218,
		"match": "AFTER_PRICE"
	},
	{
		"type": "operator",
		"start": 218,
		"end": 219,
		"match": "="
	},
	{
		"type": "string",
		"start": 219,
		"end": 221,
		"match": "ok"
	},
	{
		"type": "property",
		"start": 222,
		"end": 225,
		"match": "été"
	},
	{
		"type": "operator",
		"start": 225,
		"end": 226,
		"match": "="
	},
	{
		"type": "string",
		"start": 226,
		"end": 232,
		"match": "summer"
	},
	{
		"type": "property",
		"start": 233,
		"end": 237,
		"match": "FLAG"
	},
	{
		"type": "operator",
		"start": 237,
		"end": 238,
		"match": "="
	},
	{
		"type": "string",
		"start": 238,
		"end": 243,
		"match": "trueé"
	}
];
