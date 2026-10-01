export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 34,
		"match": "# \"\"\" $ignored @ignored ...ignored"
	},
	{
		"type": "keyword",
		"start": 35,
		"end": 40,
		"match": "query"
	},
	{
		"type": "comment",
		"start": 41,
		"end": 67,
		"match": "# between keyword and name"
	},
	{
		"type": "identifier",
		"start": 70,
		"end": 78,
		"match": "Comments"
	},
	{
		"type": "punctuation",
		"start": 78,
		"end": 79,
		"match": "("
	},
	{
		"type": "variable",
		"start": 79,
		"end": 82,
		"match": "$id"
	},
	{
		"type": "comment",
		"start": 83,
		"end": 97,
		"match": "# before colon"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 103,
		"match": ":"
	},
	{
		"type": "type",
		"start": 104,
		"end": 106,
		"match": "ID"
	},
	{
		"type": "operator",
		"start": 106,
		"end": 107,
		"match": "!"
	},
	{
		"type": "comment",
		"start": 108,
		"end": 120,
		"match": "# after type"
	},
	{
		"type": "punctuation",
		"start": 123,
		"end": 124,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 125,
		"end": 126,
		"match": "{"
	},
	{
		"type": "property",
		"start": 129,
		"end": 133,
		"match": "node"
	},
	{
		"type": "punctuation",
		"start": 133,
		"end": 134,
		"match": "("
	},
	{
		"type": "property",
		"start": 134,
		"end": 136,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 136,
		"end": 137,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 138,
		"end": 141,
		"match": "$id"
	},
	{
		"type": "punctuation",
		"start": 141,
		"end": 142,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 143,
		"end": 144,
		"match": "{"
	},
	{
		"type": "comment",
		"start": 145,
		"end": 169,
		"match": "# after selection opener"
	},
	{
		"type": "comment",
		"start": 174,
		"end": 201,
		"match": "# Comment before the spread"
	},
	{
		"type": "operator",
		"start": 206,
		"end": 209,
		"match": "..."
	},
	{
		"type": "comment",
		"start": 210,
		"end": 241,
		"match": "# Comment before type condition"
	},
	{
		"type": "keyword",
		"start": 246,
		"end": 248,
		"match": "on"
	},
	{
		"type": "comment",
		"start": 249,
		"end": 275,
		"match": "# Comment before type name"
	},
	{
		"type": "type",
		"start": 280,
		"end": 284,
		"match": "User"
	},
	{
		"type": "punctuation",
		"start": 285,
		"end": 286,
		"match": "{"
	},
	{
		"type": "property",
		"start": 287,
		"end": 289,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 290,
		"end": 291,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 294,
		"end": 295,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 296,
		"end": 297,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 298,
		"end": 337,
		"match": "# Final comment with no semantic effect"
	}
];
