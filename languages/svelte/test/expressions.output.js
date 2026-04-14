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
		"end": 2,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 2,
		"end": 3,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 9,
		"end": 10,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 10,
		"end": 14,
		"match": "name"
	},
	{
		"type": "expression",
		"start": 14,
		"end": 15,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 16,
		"end": 18,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 18,
		"end": 19,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 19,
		"end": 20,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 21,
		"end": 22,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 22,
		"end": 23,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 23,
		"end": 24,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 24,
		"end": 25,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 25,
		"end": 53,
		"match": "count === 1 ? 'one' : 'many'"
	},
	{
		"type": "expression",
		"start": 53,
		"end": 54,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 54,
		"end": 56,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 56,
		"end": 57,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 57,
		"end": 58,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 59,
		"end": 60,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 60,
		"end": 61,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 61,
		"end": 62,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 62,
		"end": 63,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 63,
		"end": 79,
		"match": "fn({a: 1, b: 2})"
	},
	{
		"type": "expression",
		"start": 79,
		"end": 80,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 80,
		"end": 82,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 82,
		"end": 83,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 83,
		"end": 84,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 85,
		"end": 86,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 86,
		"end": 87,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 87,
		"end": 88,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 88,
		"end": 89,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 89,
		"end": 102,
		"match": "\"has } brace\""
	},
	{
		"type": "expression",
		"start": 102,
		"end": 103,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 103,
		"end": 105,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 105,
		"end": 106,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 106,
		"end": 107,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 108,
		"end": 109,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 109,
		"end": 110,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 110,
		"end": 111,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 111,
		"end": 112,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 112,
		"end": 121,
		"match": "`hi ${x}`"
	},
	{
		"type": "expression",
		"start": 121,
		"end": 122,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 122,
		"end": 124,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 124,
		"end": 125,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 125,
		"end": 126,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 127,
		"end": 128,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 128,
		"end": 129,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 129,
		"end": 130,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 130,
		"end": 131,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 131,
		"end": 164,
		"match": "list.map((x) => x * 2).join(\", \")"
	},
	{
		"type": "expression",
		"start": 164,
		"end": 165,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 165,
		"end": 167,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 167,
		"end": 168,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 168,
		"end": 169,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 170,
		"end": 171,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 171,
		"end": 172,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 172,
		"end": 173,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 173,
		"end": 174,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 174,
		"end": 192,
		"match": "foo?.bar ?? \"none\""
	},
	{
		"type": "expression",
		"start": 192,
		"end": 193,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 193,
		"end": 195,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 195,
		"end": 196,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 196,
		"end": 197,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 198,
		"end": 199,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 199,
		"end": 200,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 200,
		"end": 201,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 201,
		"end": 202,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 202,
		"end": 218,
		"match": "[...arr, \"more\"]"
	},
	{
		"type": "expression",
		"start": 218,
		"end": 219,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 219,
		"end": 221,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 221,
		"end": 222,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 222,
		"end": 223,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 224,
		"end": 225,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 225,
		"end": 226,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 226,
		"end": 227,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 227,
		"end": 228,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 228,
		"end": 247,
		"match": "({a: 1, b: {c: 2}})"
	},
	{
		"type": "expression",
		"start": 247,
		"end": 248,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 248,
		"end": 250,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 250,
		"end": 251,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 251,
		"end": 252,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 253,
		"end": 254,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 254,
		"end": 255,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 255,
		"end": 256,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 256,
		"end": 257,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 257,
		"end": 287,
		"match": "list.map(({id, name}) => name)"
	},
	{
		"type": "expression",
		"start": 287,
		"end": 288,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 288,
		"end": 290,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 290,
		"end": 291,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 291,
		"end": 292,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 293,
		"end": 294,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 294,
		"end": 295,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 295,
		"end": 296,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 296,
		"end": 297,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 297,
		"end": 314,
		"match": "html`<b>${x}</b>`"
	},
	{
		"type": "expression",
		"start": 314,
		"end": 315,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 315,
		"end": 317,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 317,
		"end": 318,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 318,
		"end": 319,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 320,
		"end": 321,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 321,
		"end": 322,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 322,
		"end": 323,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 323,
		"end": 324,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 324,
		"end": 337,
		"match": "await promise"
	},
	{
		"type": "expression",
		"start": 337,
		"end": 338,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 338,
		"end": 340,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 340,
		"end": 341,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 341,
		"end": 342,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 343,
		"end": 344,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 344,
		"end": 345,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 345,
		"end": 346,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 346,
		"end": 347,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 347,
		"end": 364,
		"match": "value as SomeType"
	},
	{
		"type": "expression",
		"start": 364,
		"end": 365,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 365,
		"end": 367,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 367,
		"end": 368,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 368,
		"end": 369,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 370,
		"end": 371,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 371,
		"end": 372,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 372,
		"end": 373,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 373,
		"end": 374,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 374,
		"end": 382,
		"match": "fn<T>(x)"
	},
	{
		"type": "expression",
		"start": 382,
		"end": 383,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 383,
		"end": 385,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 385,
		"end": 386,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 386,
		"end": 387,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 388,
		"end": 389,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 389,
		"end": 390,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 390,
		"end": 391,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 391,
		"end": 392,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 392,
		"end": 417,
		"match": "x /* inline } note */ + 1"
	},
	{
		"type": "expression",
		"start": 417,
		"end": 418,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 418,
		"end": 420,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 420,
		"end": 421,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 421,
		"end": 422,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 423,
		"end": 424,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 424,
		"end": 425,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 425,
		"end": 426,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 426,
		"end": 427,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 427,
		"end": 448,
		"match": "x // trailing } note\n"
	},
	{
		"type": "expression",
		"start": 448,
		"end": 449,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 449,
		"end": 451,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 451,
		"end": 452,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 452,
		"end": 453,
		"match": ">"
	}
];
