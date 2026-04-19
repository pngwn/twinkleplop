export const test = [
	{
		"type": "expression",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1,
		"end": 2,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 2,
		"end": 6,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 6,
		"end": 26,
		"match": " items as {id, name}"
	},
	{
		"type": "expression",
		"start": 26,
		"end": 27,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 29,
		"end": 30,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 30,
		"end": 32,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 32,
		"end": 33,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 33,
		"end": 34,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 34,
		"end": 36,
		"match": "id"
	},
	{
		"type": "expression",
		"start": 36,
		"end": 37,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 39,
		"end": 40,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 40,
		"end": 44,
		"match": "name"
	},
	{
		"type": "expression",
		"start": 44,
		"end": 45,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 45,
		"end": 47,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 47,
		"end": 49,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 49,
		"end": 50,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 51,
		"end": 52,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 52,
		"end": 53,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 53,
		"end": 57,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 57,
		"end": 58,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 60,
		"end": 61,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 61,
		"end": 62,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 62,
		"end": 66,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 66,
		"end": 82,
		"match": " pairs as [k, v]"
	},
	{
		"type": "expression",
		"start": 82,
		"end": 83,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 85,
		"end": 86,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 86,
		"end": 88,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 88,
		"end": 89,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 89,
		"end": 90,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 90,
		"end": 91,
		"match": "k"
	},
	{
		"type": "expression",
		"start": 91,
		"end": 92,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 93,
		"end": 94,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 94,
		"end": 95,
		"match": "v"
	},
	{
		"type": "expression",
		"start": 95,
		"end": 96,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 96,
		"end": 98,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 98,
		"end": 100,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 100,
		"end": 101,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 102,
		"end": 103,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 103,
		"end": 104,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 104,
		"end": 108,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 108,
		"end": 109,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 111,
		"end": 112,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 112,
		"end": 113,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 113,
		"end": 117,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 117,
		"end": 141,
		"match": " items as {data: {name}}"
	},
	{
		"type": "expression",
		"start": 141,
		"end": 142,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 144,
		"end": 145,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 145,
		"end": 147,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 147,
		"end": 148,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 148,
		"end": 149,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 149,
		"end": 153,
		"match": "name"
	},
	{
		"type": "expression",
		"start": 153,
		"end": 154,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 154,
		"end": 156,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 156,
		"end": 158,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 158,
		"end": 159,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 160,
		"end": 161,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 161,
		"end": 162,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 162,
		"end": 166,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 166,
		"end": 167,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 169,
		"end": 170,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 170,
		"end": 171,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 171,
		"end": 175,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 175,
		"end": 213,
		"match": " items.filter((x) => x.active) as item"
	},
	{
		"type": "expression",
		"start": 213,
		"end": 214,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 216,
		"end": 217,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 217,
		"end": 219,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 219,
		"end": 220,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 220,
		"end": 221,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 221,
		"end": 225,
		"match": "item"
	},
	{
		"type": "expression",
		"start": 225,
		"end": 226,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 226,
		"end": 228,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 228,
		"end": 230,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 230,
		"end": 231,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 232,
		"end": 233,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 233,
		"end": 234,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 234,
		"end": 238,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 238,
		"end": 239,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 241,
		"end": 242,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 242,
		"end": 243,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 243,
		"end": 247,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 247,
		"end": 280,
		"match": " items as item (`row-${item.id}`)"
	},
	{
		"type": "expression",
		"start": 280,
		"end": 281,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 283,
		"end": 284,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 284,
		"end": 286,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 286,
		"end": 287,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 287,
		"end": 288,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 288,
		"end": 292,
		"match": "item"
	},
	{
		"type": "expression",
		"start": 292,
		"end": 293,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 293,
		"end": 295,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 295,
		"end": 297,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 297,
		"end": 298,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 299,
		"end": 300,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 300,
		"end": 301,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 301,
		"end": 305,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 305,
		"end": 306,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 308,
		"end": 309,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 309,
		"end": 310,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 310,
		"end": 314,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 314,
		"end": 347,
		"match": " (pairs as SomeType<T>) as [k, v]"
	},
	{
		"type": "expression",
		"start": 347,
		"end": 348,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 350,
		"end": 351,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 351,
		"end": 353,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 353,
		"end": 354,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 354,
		"end": 355,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 355,
		"end": 356,
		"match": "k"
	},
	{
		"type": "expression",
		"start": 356,
		"end": 357,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 358,
		"end": 359,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 359,
		"end": 360,
		"match": "v"
	},
	{
		"type": "expression",
		"start": 360,
		"end": 361,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 361,
		"end": 363,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 363,
		"end": 365,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 365,
		"end": 366,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 367,
		"end": 368,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 368,
		"end": 369,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 369,
		"end": 373,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 373,
		"end": 374,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 376,
		"end": 377,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 377,
		"end": 378,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 378,
		"end": 382,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 382,
		"end": 443,
		"match": " arr.filter(b => (1, 2, \"}\")) as t as id, i (`${id + 1}_key`)"
	},
	{
		"type": "expression",
		"start": 443,
		"end": 444,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 446,
		"end": 447,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 447,
		"end": 449,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 449,
		"end": 450,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 450,
		"end": 451,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 451,
		"end": 453,
		"match": "id"
	},
	{
		"type": "expression",
		"start": 453,
		"end": 454,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 454,
		"end": 456,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 456,
		"end": 458,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 458,
		"end": 459,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 460,
		"end": 461,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 461,
		"end": 462,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 462,
		"end": 466,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 466,
		"end": 467,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 469,
		"end": 470,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 470,
		"end": 471,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 471,
		"end": 473,
		"match": "if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 473,
		"end": 498,
		"match": " user?.permissions?.admin"
	},
	{
		"type": "expression",
		"start": 498,
		"end": 499,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 501,
		"end": 502,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 502,
		"end": 503,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 503,
		"end": 504,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 511,
		"end": 513,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 513,
		"end": 514,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 514,
		"end": 515,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 516,
		"end": 517,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 517,
		"end": 518,
		"match": ":"
	},
	{
		"type": "svelte_block",
		"start": 518,
		"end": 525,
		"match": "else if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 525,
		"end": 542,
		"match": " x instanceof Foo"
	},
	{
		"type": "expression",
		"start": 542,
		"end": 543,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 545,
		"end": 546,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 546,
		"end": 547,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 547,
		"end": 548,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 551,
		"end": 553,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 553,
		"end": 554,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 554,
		"end": 555,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 556,
		"end": 557,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 557,
		"end": 558,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 558,
		"end": 560,
		"match": "if"
	},
	{
		"type": "expression",
		"start": 560,
		"end": 561,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 563,
		"end": 564,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 564,
		"end": 565,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 565,
		"end": 570,
		"match": "await"
	},
	{
		"type": "raw_svelte_expression",
		"start": 570,
		"end": 593,
		"match": " api.load().then(parse)"
	},
	{
		"type": "expression",
		"start": 593,
		"end": 594,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 596,
		"end": 597,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 597,
		"end": 598,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 598,
		"end": 599,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 606,
		"end": 608,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 608,
		"end": 609,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 609,
		"end": 610,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 611,
		"end": 612,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 612,
		"end": 613,
		"match": ":"
	},
	{
		"type": "svelte_block",
		"start": 613,
		"end": 617,
		"match": "then"
	},
	{
		"type": "raw_svelte_expression",
		"start": 617,
		"end": 629,
		"match": " {name, age}"
	},
	{
		"type": "expression",
		"start": 629,
		"end": 630,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 632,
		"end": 633,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 633,
		"end": 634,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 634,
		"end": 635,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 635,
		"end": 636,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 636,
		"end": 640,
		"match": "name"
	},
	{
		"type": "expression",
		"start": 640,
		"end": 641,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 642,
		"end": 643,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 643,
		"end": 646,
		"match": "age"
	},
	{
		"type": "expression",
		"start": 646,
		"end": 647,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 647,
		"end": 649,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 649,
		"end": 650,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 650,
		"end": 651,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 652,
		"end": 653,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 653,
		"end": 654,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 654,
		"end": 659,
		"match": "await"
	},
	{
		"type": "expression",
		"start": 659,
		"end": 660,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 662,
		"end": 663,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 663,
		"end": 664,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 664,
		"end": 671,
		"match": "snippet"
	},
	{
		"type": "raw_svelte_expression",
		"start": 671,
		"end": 687,
		"match": " row({id, name})"
	},
	{
		"type": "expression",
		"start": 687,
		"end": 688,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 690,
		"end": 691,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 691,
		"end": 693,
		"match": "tr"
	},
	{
		"type": "punctuation",
		"start": 693,
		"end": 695,
		"match": "><"
	},
	{
		"type": "tag_name",
		"start": 695,
		"end": 697,
		"match": "td"
	},
	{
		"type": "punctuation",
		"start": 697,
		"end": 698,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 698,
		"end": 699,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 699,
		"end": 701,
		"match": "id"
	},
	{
		"type": "expression",
		"start": 701,
		"end": 702,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 702,
		"end": 704,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 704,
		"end": 706,
		"match": "td"
	},
	{
		"type": "punctuation",
		"start": 706,
		"end": 708,
		"match": "><"
	},
	{
		"type": "tag_name",
		"start": 708,
		"end": 710,
		"match": "td"
	},
	{
		"type": "punctuation",
		"start": 710,
		"end": 711,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 711,
		"end": 712,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 712,
		"end": 716,
		"match": "name"
	},
	{
		"type": "expression",
		"start": 716,
		"end": 717,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 717,
		"end": 719,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 719,
		"end": 721,
		"match": "td"
	},
	{
		"type": "punctuation",
		"start": 721,
		"end": 724,
		"match": "></"
	},
	{
		"type": "tag_name",
		"start": 724,
		"end": 726,
		"match": "tr"
	},
	{
		"type": "punctuation",
		"start": 726,
		"end": 727,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 728,
		"end": 729,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 729,
		"end": 730,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 730,
		"end": 737,
		"match": "snippet"
	},
	{
		"type": "expression",
		"start": 737,
		"end": 738,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 740,
		"end": 741,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 741,
		"end": 742,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 742,
		"end": 749,
		"match": "snippet"
	},
	{
		"type": "raw_svelte_expression",
		"start": 749,
		"end": 763,
		"match": " head(...cols)"
	},
	{
		"type": "expression",
		"start": 763,
		"end": 764,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 766,
		"end": 767,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 767,
		"end": 769,
		"match": "tr"
	},
	{
		"type": "punctuation",
		"start": 769,
		"end": 770,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 770,
		"end": 771,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 771,
		"end": 785,
		"match": "cols.join(\",\")"
	},
	{
		"type": "expression",
		"start": 785,
		"end": 786,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 786,
		"end": 788,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 788,
		"end": 790,
		"match": "tr"
	},
	{
		"type": "punctuation",
		"start": 790,
		"end": 791,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 792,
		"end": 793,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 793,
		"end": 794,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 794,
		"end": 801,
		"match": "snippet"
	},
	{
		"type": "expression",
		"start": 801,
		"end": 802,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 804,
		"end": 805,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 805,
		"end": 806,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 806,
		"end": 813,
		"match": "snippet"
	},
	{
		"type": "raw_svelte_expression",
		"start": 813,
		"end": 829,
		"match": " cell(data = {})"
	},
	{
		"type": "expression",
		"start": 829,
		"end": 830,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 832,
		"end": 833,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 833,
		"end": 835,
		"match": "td"
	},
	{
		"type": "punctuation",
		"start": 835,
		"end": 836,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 836,
		"end": 837,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 837,
		"end": 847,
		"match": "data.value"
	},
	{
		"type": "expression",
		"start": 847,
		"end": 848,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 848,
		"end": 850,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 850,
		"end": 852,
		"match": "td"
	},
	{
		"type": "punctuation",
		"start": 852,
		"end": 853,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 854,
		"end": 855,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 855,
		"end": 856,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 856,
		"end": 863,
		"match": "snippet"
	},
	{
		"type": "expression",
		"start": 863,
		"end": 864,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 866,
		"end": 867,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 867,
		"end": 868,
		"match": "@"
	},
	{
		"type": "svelte_block",
		"start": 868,
		"end": 873,
		"match": "const"
	},
	{
		"type": "raw_svelte_expression",
		"start": 873,
		"end": 898,
		"match": " label = `${count} items`"
	},
	{
		"type": "expression",
		"start": 898,
		"end": 899,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 900,
		"end": 901,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 901,
		"end": 902,
		"match": "@"
	},
	{
		"type": "svelte_block",
		"start": 902,
		"end": 907,
		"match": "const"
	},
	{
		"type": "raw_svelte_expression",
		"start": 907,
		"end": 930,
		"match": " pair = [first, second]"
	},
	{
		"type": "expression",
		"start": 930,
		"end": 931,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 933,
		"end": 934,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 934,
		"end": 935,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 935,
		"end": 937,
		"match": "if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 937,
		"end": 954,
		"match": " x /* > }? */ > 0"
	},
	{
		"type": "expression",
		"start": 954,
		"end": 955,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 957,
		"end": 958,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 958,
		"end": 959,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 959,
		"end": 960,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 968,
		"end": 970,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 970,
		"end": 971,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 971,
		"end": 972,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 973,
		"end": 974,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 974,
		"end": 975,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 975,
		"end": 977,
		"match": "if"
	},
	{
		"type": "expression",
		"start": 977,
		"end": 978,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 981,
		"end": 982,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 982,
		"end": 983,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 983,
		"end": 987,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 987,
		"end": 1086,
		"match": " arr.filter(b => ({\n  a: 1,\n  /* > }? */  c: \"}\"\n})) as A<B> as C as D, i (html`<h1>hi</h1>` + \"}\")"
	},
	{
		"type": "expression",
		"start": 1086,
		"end": 1087,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1089,
		"end": 1090,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1090,
		"end": 1092,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 1092,
		"end": 1093,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1093,
		"end": 1094,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1094,
		"end": 1096,
		"match": "id"
	},
	{
		"type": "expression",
		"start": 1096,
		"end": 1097,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1097,
		"end": 1099,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1099,
		"end": 1101,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 1101,
		"end": 1102,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1103,
		"end": 1104,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1104,
		"end": 1105,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 1105,
		"end": 1109,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 1109,
		"end": 1110,
		"match": "}"
	}
];
