export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 5,
		"end": 11,
		"match": "alpine"
	},
	{
		"type": "keyword",
		"start": 12,
		"end": 15,
		"match": "ARG"
	},
	{
		"type": "property",
		"start": 16,
		"end": 20,
		"match": "NAME"
	},
	{
		"type": "operator",
		"start": 20,
		"end": 21,
		"match": "="
	},
	{
		"type": "string",
		"start": 21,
		"end": 26,
		"match": "world"
	},
	{
		"type": "keyword",
		"start": 27,
		"end": 31,
		"match": "COPY"
	},
	{
		"type": "operator",
		"start": 32,
		"end": 34,
		"match": "<<"
	},
	{
		"type": "string",
		"start": 34,
		"end": 37,
		"match": "EOF"
	},
	{
		"type": "string",
		"start": 38,
		"end": 47,
		"match": "/greeting"
	},
	{
		"type": "string",
		"start": 48,
		"end": 53,
		"match": "hello"
	},
	{
		"type": "variable",
		"start": 54,
		"end": 61,
		"match": "${NAME}"
	},
	{
		"type": "string",
		"start": 62,
		"end": 65,
		"match": "EOF"
	},
	{
		"type": "keyword",
		"start": 66,
		"end": 70,
		"match": "COPY"
	},
	{
		"type": "operator",
		"start": 71,
		"end": 74,
		"match": "<<-"
	},
	{
		"type": "string",
		"start": 74,
		"end": 83,
		"match": "'LITERAL'"
	},
	{
		"type": "string",
		"start": 84,
		"end": 94,
		"match": "/script.sh"
	},
	{
		"type": "string",
		"start": 96,
		"end": 100,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 101,
		"end": 102,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 102,
		"end": 107,
		"match": "$NAME"
	},
	{
		"type": "string",
		"start": 107,
		"end": 108,
		"match": "\""
	},
	{
		"type": "string",
		"start": 110,
		"end": 117,
		"match": "LITERAL"
	},
	{
		"type": "keyword",
		"start": 118,
		"end": 121,
		"match": "RUN"
	},
	{
		"type": "operator",
		"start": 122,
		"end": 124,
		"match": "<<"
	},
	{
		"type": "string",
		"start": 124,
		"end": 129,
		"match": "FIRST"
	},
	{
		"type": "string",
		"start": 130,
		"end": 133,
		"match": "cat"
	},
	{
		"type": "operator",
		"start": 134,
		"end": 135,
		"match": ">"
	},
	{
		"type": "string",
		"start": 136,
		"end": 140,
		"match": "/one"
	},
	{
		"type": "operator",
		"start": 141,
		"end": 143,
		"match": "&&"
	},
	{
		"type": "operator",
		"start": 144,
		"end": 146,
		"match": "<<"
	},
	{
		"type": "string",
		"start": 146,
		"end": 152,
		"match": "SECOND"
	},
	{
		"type": "string",
		"start": 153,
		"end": 156,
		"match": "cat"
	},
	{
		"type": "operator",
		"start": 157,
		"end": 158,
		"match": ">"
	},
	{
		"type": "string",
		"start": 159,
		"end": 163,
		"match": "/two"
	},
	{
		"type": "string",
		"start": 164,
		"end": 169,
		"match": "first"
	},
	{
		"type": "string",
		"start": 170,
		"end": 175,
		"match": "FIRST"
	},
	{
		"type": "string",
		"start": 176,
		"end": 182,
		"match": "second"
	},
	{
		"type": "string",
		"start": 183,
		"end": 189,
		"match": "SECOND"
	},
	{
		"type": "keyword",
		"start": 190,
		"end": 193,
		"match": "RUN"
	},
	{
		"type": "operator",
		"start": 194,
		"end": 197,
		"match": "<<-"
	},
	{
		"type": "string",
		"start": 197,
		"end": 205,
		"match": "\"SCRIPT\""
	},
	{
		"type": "string",
		"start": 206,
		"end": 208,
		"match": "sh"
	},
	{
		"type": "string",
		"start": 210,
		"end": 216,
		"match": "printf"
	},
	{
		"type": "string",
		"start": 217,
		"end": 223,
		"match": "'%s\\n'"
	},
	{
		"type": "string",
		"start": 224,
		"end": 231,
		"match": "\"hello\""
	},
	{
		"type": "string",
		"start": 233,
		"end": 239,
		"match": "SCRIPT"
	},
	{
		"type": "keyword",
		"start": 240,
		"end": 243,
		"match": "CMD"
	},
	{
		"type": "punctuation",
		"start": 244,
		"end": 245,
		"match": "["
	},
	{
		"type": "string",
		"start": 245,
		"end": 249,
		"match": "\"sh\""
	},
	{
		"type": "punctuation",
		"start": 249,
		"end": 250,
		"match": "]"
	}
];
