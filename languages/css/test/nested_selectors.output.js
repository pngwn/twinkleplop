export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 40,
		"match": "/* Test nested selectors and at-rules */"
	},
	{
		"type": "comment",
		"start": 42,
		"end": 85,
		"match": "/* Nested selectors inside regular rules */"
	},
	{
		"type": "selector_class",
		"start": 86,
		"end": 93,
		"match": ".parent"
	},
	{
		"type": "punctuation",
		"start": 94,
		"end": 95,
		"match": "{"
	},
	{
		"type": "property",
		"start": 97,
		"end": 102,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 103,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 104,
		"end": 108,
		"match": "blue"
	},
	{
		"type": "punctuation",
		"start": 108,
		"end": 109,
		"match": ";"
	},
	{
		"type": "selector_class",
		"start": 112,
		"end": 118,
		"match": ".child"
	},
	{
		"type": "punctuation",
		"start": 119,
		"end": 120,
		"match": "{"
	},
	{
		"type": "property",
		"start": 123,
		"end": 128,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 128,
		"end": 129,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 130,
		"end": 133,
		"match": "red"
	},
	{
		"type": "punctuation",
		"start": 133,
		"end": 134,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 136,
		"end": 137,
		"match": "}"
	},
	{
		"type": "selector_id",
		"start": 140,
		"end": 150,
		"match": "#nested-id"
	},
	{
		"type": "punctuation",
		"start": 151,
		"end": 152,
		"match": "{"
	},
	{
		"type": "property",
		"start": 155,
		"end": 165,
		"match": "background"
	},
	{
		"type": "punctuation",
		"start": 165,
		"end": 166,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 167,
		"end": 172,
		"match": "white"
	},
	{
		"type": "punctuation",
		"start": 172,
		"end": 173,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 175,
		"end": 176,
		"match": "}"
	},
	{
		"type": "selector",
		"start": 179,
		"end": 180,
		"match": "&"
	},
	{
		"type": "selector_pseudo",
		"start": 180,
		"end": 186,
		"match": ":hover"
	},
	{
		"type": "punctuation",
		"start": 187,
		"end": 188,
		"match": "{"
	},
	{
		"type": "property",
		"start": 191,
		"end": 196,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 196,
		"end": 197,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 198,
		"end": 203,
		"match": "green"
	},
	{
		"type": "punctuation",
		"start": 203,
		"end": 204,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 206,
		"end": 207,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 208,
		"end": 209,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 211,
		"end": 242,
		"match": "/* Selectors inside at-rules */"
	},
	{
		"type": "keyword",
		"start": 243,
		"end": 249,
		"match": "@media"
	},
	{
		"type": "punctuation",
		"start": 250,
		"end": 251,
		"match": "("
	},
	{
		"type": "keyword",
		"start": 251,
		"end": 260,
		"match": "min-width"
	},
	{
		"type": "punctuation",
		"start": 260,
		"end": 261,
		"match": ":"
	},
	{
		"type": "number",
		"start": 262,
		"end": 265,
		"match": "768"
	},
	{
		"type": "unit",
		"start": 265,
		"end": 267,
		"match": "px"
	},
	{
		"type": "punctuation",
		"start": 267,
		"end": 268,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 269,
		"end": 270,
		"match": "{"
	},
	{
		"type": "selector_class",
		"start": 272,
		"end": 289,
		"match": ".responsive-class"
	},
	{
		"type": "punctuation",
		"start": 290,
		"end": 291,
		"match": "{"
	},
	{
		"type": "property",
		"start": 294,
		"end": 301,
		"match": "display"
	},
	{
		"type": "punctuation",
		"start": 301,
		"end": 302,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 303,
		"end": 308,
		"match": "block"
	},
	{
		"type": "punctuation",
		"start": 308,
		"end": 309,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 311,
		"end": 312,
		"match": "}"
	},
	{
		"type": "selector_id",
		"start": 315,
		"end": 329,
		"match": "#responsive-id"
	},
	{
		"type": "punctuation",
		"start": 330,
		"end": 331,
		"match": "{"
	},
	{
		"type": "property",
		"start": 334,
		"end": 339,
		"match": "width"
	},
	{
		"type": "punctuation",
		"start": 339,
		"end": 340,
		"match": ":"
	},
	{
		"type": "number",
		"start": 341,
		"end": 344,
		"match": "100"
	},
	{
		"type": "unit",
		"start": 344,
		"end": 345,
		"match": "%"
	},
	{
		"type": "punctuation",
		"start": 345,
		"end": 346,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 348,
		"end": 349,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 350,
		"end": 351,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 353,
		"end": 371,
		"match": "/* Deep nesting */"
	},
	{
		"type": "selector_class",
		"start": 372,
		"end": 379,
		"match": ".level1"
	},
	{
		"type": "punctuation",
		"start": 380,
		"end": 381,
		"match": "{"
	},
	{
		"type": "property",
		"start": 383,
		"end": 388,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 388,
		"end": 389,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 390,
		"end": 393,
		"match": "red"
	},
	{
		"type": "punctuation",
		"start": 393,
		"end": 394,
		"match": ";"
	},
	{
		"type": "selector_class",
		"start": 397,
		"end": 404,
		"match": ".level2"
	},
	{
		"type": "punctuation",
		"start": 405,
		"end": 406,
		"match": "{"
	},
	{
		"type": "property",
		"start": 409,
		"end": 414,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 414,
		"end": 415,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 416,
		"end": 420,
		"match": "blue"
	},
	{
		"type": "punctuation",
		"start": 420,
		"end": 421,
		"match": ";"
	},
	{
		"type": "selector_class",
		"start": 425,
		"end": 432,
		"match": ".level3"
	},
	{
		"type": "punctuation",
		"start": 433,
		"end": 434,
		"match": "{"
	},
	{
		"type": "selector",
		"start": 438,
		"end": 442,
		"match": "body"
	},
	{
		"type": "punctuation",
		"start": 443,
		"end": 444,
		"match": "{"
	},
	{
		"type": "property",
		"start": 449,
		"end": 454,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 454,
		"end": 455,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 456,
		"end": 462,
		"match": "yellow"
	},
	{
		"type": "punctuation",
		"start": 462,
		"end": 463,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 467,
		"end": 468,
		"match": "}"
	},
	{
		"type": "selector",
		"start": 473,
		"end": 477,
		"match": "body"
	},
	{
		"type": "selector_pseudo",
		"start": 477,
		"end": 483,
		"match": ":hover"
	},
	{
		"type": "punctuation",
		"start": 484,
		"end": 485,
		"match": "{"
	},
	{
		"type": "property",
		"start": 490,
		"end": 495,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 495,
		"end": 496,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 497,
		"end": 503,
		"match": "purple"
	},
	{
		"type": "punctuation",
		"start": 503,
		"end": 504,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 508,
		"end": 509,
		"match": "}"
	},
	{
		"type": "property",
		"start": 514,
		"end": 519,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 519,
		"end": 520,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 521,
		"end": 526,
		"match": "green"
	},
	{
		"type": "punctuation",
		"start": 526,
		"end": 527,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 530,
		"end": 531,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 533,
		"end": 534,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 535,
		"end": 536,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 538,
		"end": 581,
		"match": "/* Mixed properties and nested selectors */"
	},
	{
		"type": "selector_class",
		"start": 582,
		"end": 588,
		"match": ".mixed"
	},
	{
		"type": "punctuation",
		"start": 589,
		"end": 590,
		"match": "{"
	},
	{
		"type": "property",
		"start": 592,
		"end": 597,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 597,
		"end": 598,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 599,
		"end": 603,
		"match": "blue"
	},
	{
		"type": "punctuation",
		"start": 603,
		"end": 604,
		"match": ";"
	},
	{
		"type": "property",
		"start": 606,
		"end": 615,
		"match": "font-size"
	},
	{
		"type": "punctuation",
		"start": 615,
		"end": 616,
		"match": ":"
	},
	{
		"type": "number",
		"start": 617,
		"end": 619,
		"match": "14"
	},
	{
		"type": "unit",
		"start": 619,
		"end": 621,
		"match": "px"
	},
	{
		"type": "punctuation",
		"start": 621,
		"end": 622,
		"match": ";"
	},
	{
		"type": "selector_class",
		"start": 625,
		"end": 632,
		"match": ".nested"
	},
	{
		"type": "punctuation",
		"start": 633,
		"end": 634,
		"match": "{"
	},
	{
		"type": "property",
		"start": 637,
		"end": 642,
		"match": "color"
	},
	{
		"type": "punctuation",
		"start": 642,
		"end": 643,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 644,
		"end": 647,
		"match": "red"
	},
	{
		"type": "punctuation",
		"start": 647,
		"end": 648,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 650,
		"end": 651,
		"match": "}"
	},
	{
		"type": "property",
		"start": 654,
		"end": 664,
		"match": "background"
	},
	{
		"type": "punctuation",
		"start": 664,
		"end": 665,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 666,
		"end": 671,
		"match": "white"
	},
	{
		"type": "punctuation",
		"start": 671,
		"end": 672,
		"match": ";"
	},
	{
		"type": "selector_id",
		"start": 675,
		"end": 683,
		"match": "#another"
	},
	{
		"type": "punctuation",
		"start": 684,
		"end": 685,
		"match": "{"
	},
	{
		"type": "property",
		"start": 688,
		"end": 694,
		"match": "margin"
	},
	{
		"type": "punctuation",
		"start": 694,
		"end": 695,
		"match": ":"
	},
	{
		"type": "number",
		"start": 696,
		"end": 698,
		"match": "10"
	},
	{
		"type": "unit",
		"start": 698,
		"end": 700,
		"match": "px"
	},
	{
		"type": "punctuation",
		"start": 700,
		"end": 701,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 703,
		"end": 704,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 705,
		"end": 706,
		"match": "}"
	}
];
