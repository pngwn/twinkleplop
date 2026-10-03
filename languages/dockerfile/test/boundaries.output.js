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
		"end": 14,
		"match": "alpine:AS"
	},
	{
		"type": "keyword",
		"start": 15,
		"end": 17,
		"match": "AS"
	},
	{
		"type": "string",
		"start": 18,
		"end": 23,
		"match": "build"
	},
	{
		"type": "string",
		"start": 24,
		"end": 31,
		"match": "RUNNING"
	},
	{
		"type": "string",
		"start": 32,
		"end": 34,
		"match": "is"
	},
	{
		"type": "string",
		"start": 35,
		"end": 38,
		"match": "not"
	},
	{
		"type": "string",
		"start": 39,
		"end": 41,
		"match": "an"
	},
	{
		"type": "string",
		"start": 42,
		"end": 53,
		"match": "instruction"
	},
	{
		"type": "string",
		"start": 54,
		"end": 64,
		"match": "RUN-script"
	},
	{
		"type": "string",
		"start": 65,
		"end": 67,
		"match": "is"
	},
	{
		"type": "string",
		"start": 68,
		"end": 71,
		"match": "not"
	},
	{
		"type": "string",
		"start": 72,
		"end": 74,
		"match": "an"
	},
	{
		"type": "string",
		"start": 75,
		"end": 86,
		"match": "instruction"
	},
	{
		"type": "string",
		"start": 87,
		"end": 95,
		"match": "COPY.foo"
	},
	{
		"type": "string",
		"start": 96,
		"end": 98,
		"match": "is"
	},
	{
		"type": "string",
		"start": 99,
		"end": 102,
		"match": "not"
	},
	{
		"type": "string",
		"start": 103,
		"end": 105,
		"match": "an"
	},
	{
		"type": "string",
		"start": 106,
		"end": 117,
		"match": "instruction"
	},
	{
		"type": "string",
		"start": 118,
		"end": 122,
		"match": "xRUN"
	},
	{
		"type": "string",
		"start": 123,
		"end": 125,
		"match": "is"
	},
	{
		"type": "string",
		"start": 126,
		"end": 129,
		"match": "not"
	},
	{
		"type": "string",
		"start": 130,
		"end": 132,
		"match": "an"
	},
	{
		"type": "string",
		"start": 133,
		"end": 144,
		"match": "instruction"
	},
	{
		"type": "keyword",
		"start": 145,
		"end": 148,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 149,
		"end": 153,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 154,
		"end": 158,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 159,
		"end": 162,
		"match": "CMD"
	},
	{
		"type": "string",
		"start": 163,
		"end": 165,
		"match": "AS"
	},
	{
		"type": "string",
		"start": 166,
		"end": 170,
		"match": "NONE"
	},
	{
		"type": "string",
		"start": 171,
		"end": 182,
		"match": "HEALTHCHECK"
	},
	{
		"type": "keyword",
		"start": 183,
		"end": 194,
		"match": "HEALTHCHECK"
	},
	{
		"type": "string",
		"start": 195,
		"end": 204,
		"match": "NONE-more"
	},
	{
		"type": "keyword",
		"start": 205,
		"end": 209,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 210,
		"end": 216,
		"match": "alpine"
	},
	{
		"type": "string",
		"start": 217,
		"end": 224,
		"match": "AS-more"
	},
	{
		"type": "keyword",
		"start": 225,
		"end": 228,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 229,
		"end": 233,
		"match": "echo"
	},
	{
		"type": "operator",
		"start": 234,
		"end": 236,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 238,
		"end": 242,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 243,
		"end": 245,
		"match": "is"
	},
	{
		"type": "string",
		"start": 246,
		"end": 247,
		"match": "a"
	},
	{
		"type": "string",
		"start": 248,
		"end": 257,
		"match": "continued"
	},
	{
		"type": "string",
		"start": 258,
		"end": 266,
		"match": "argument"
	},
	{
		"type": "keyword",
		"start": 267,
		"end": 270,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 271,
		"end": 275,
		"match": "FROM"
	},
	{
		"type": "operator",
		"start": 275,
		"end": 276,
		"match": "="
	},
	{
		"type": "string",
		"start": 276,
		"end": 283,
		"match": "literal"
	},
	{
		"type": "property",
		"start": 284,
		"end": 286,
		"match": "AS"
	},
	{
		"type": "operator",
		"start": 286,
		"end": 287,
		"match": "="
	},
	{
		"type": "string",
		"start": 287,
		"end": 294,
		"match": "literal"
	},
	{
		"type": "property",
		"start": 295,
		"end": 302,
		"match": "RUNNING"
	},
	{
		"type": "operator",
		"start": 302,
		"end": 303,
		"match": "="
	},
	{
		"type": "string",
		"start": 303,
		"end": 308,
		"match": "value"
	},
	{
		"type": "keyword",
		"start": 309,
		"end": 312,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 313,
		"end": 317,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 318,
		"end": 329,
		"match": "\"unfinished"
	},
	{
		"type": "keyword",
		"start": 330,
		"end": 334,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 335,
		"end": 341,
		"match": "alpine"
	},
	{
		"type": "keyword",
		"start": 342,
		"end": 346,
		"match": "COPY"
	},
	{
		"type": "punctuation",
		"start": 347,
		"end": 348,
		"match": "["
	},
	{
		"type": "string",
		"start": 348,
		"end": 359,
		"match": "\"unfinished"
	},
	{
		"type": "keyword",
		"start": 360,
		"end": 364,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 365,
		"end": 372,
		"match": "busybox"
	},
	{
		"type": "keyword",
		"start": 373,
		"end": 376,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 377,
		"end": 383,
		"match": "BROKEN"
	},
	{
		"type": "operator",
		"start": 383,
		"end": 384,
		"match": "="
	},
	{
		"type": "variable",
		"start": 384,
		"end": 389,
		"match": "${X:-"
	},
	{
		"type": "variable",
		"start": 389,
		"end": 392,
		"match": "${Y"
	},
	{
		"type": "keyword",
		"start": 393,
		"end": 397,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 398,
		"end": 405,
		"match": "scratch"
	}
];
