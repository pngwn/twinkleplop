export const test = [
	{
		"type": "front_matter_marker",
		"start": 0,
		"end": 4,
		"match": "---\n"
	},
	{
		"type": "raw_front_matter",
		"start": 4,
		"end": 39,
		"match": "title: Getting started\nlayout: docs"
	},
	{
		"type": "front_matter_marker",
		"start": 39,
		"end": 44,
		"match": "\n---\n"
	},
	{
		"type": "raw_script",
		"start": 44,
		"end": 79,
		"match": "import Tabs from '$lib/Tabs.svelte'"
	},
	{
		"type": "punctuation",
		"start": 81,
		"end": 82,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 82,
		"end": 88,
		"match": "script"
	},
	{
		"type": "punctuation",
		"start": 88,
		"end": 89,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 89,
		"end": 117,
		"match": "\n  let { data } = $props();\n"
	},
	{
		"type": "punctuation",
		"start": 117,
		"end": 119,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 119,
		"end": 125,
		"match": "script"
	},
	{
		"type": "punctuation",
		"start": 125,
		"end": 126,
		"match": ">"
	},
	{
		"type": "heading_marker",
		"start": 128,
		"end": 130,
		"match": "# "
	},
	{
		"type": "heading",
		"start": 130,
		"end": 151,
		"match": "Getting started with "
	},
	{
		"type": "expression",
		"start": 151,
		"end": 152,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 152,
		"end": 161,
		"match": "data.name"
	},
	{
		"type": "expression",
		"start": 161,
		"end": 162,
		"match": "}"
	},
	{
		"type": "italic_open",
		"start": 186,
		"end": 187,
		"match": "_"
	},
	{
		"type": "italic",
		"start": 187,
		"end": 195,
		"match": "markdown"
	},
	{
		"type": "italic_close",
		"start": 195,
		"end": 196,
		"match": "_"
	},
	{
		"type": "bold_open",
		"start": 202,
		"end": 203,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 203,
		"end": 209,
		"match": "Svelte"
	},
	{
		"type": "bold_close",
		"start": 209,
		"end": 210,
		"match": "*"
	},
	{
		"type": "link_text_open",
		"start": 216,
		"end": 218,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 218,
		"end": 221,
		"match": "why"
	},
	{
		"type": "link_text_close",
		"start": 221,
		"end": 222,
		"match": "]"
	},
	{
		"type": "code_fence",
		"start": 237,
		"end": 240,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 240,
		"end": 242,
		"match": "sh"
	},
	{
		"type": "raw_code_block",
		"start": 242,
		"end": 270,
		"match": "\nnpm install -D mdsvex@next\n"
	},
	{
		"type": "code_fence",
		"start": 270,
		"end": 274,
		"match": "```\n"
	},
	{
		"type": "punctuation",
		"start": 275,
		"end": 278,
		"match": ":::"
	},
	{
		"type": "function",
		"start": 278,
		"end": 281,
		"match": "tip"
	},
	{
		"type": "link_text_open",
		"start": 281,
		"end": 282,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 282,
		"end": 298,
		"match": "Before you start"
	},
	{
		"type": "link_text_close",
		"start": 298,
		"end": 299,
		"match": "]"
	},
	{
		"type": "bold_open",
		"start": 309,
		"end": 310,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 310,
		"end": 319,
		"match": "*Svelte 5"
	},
	{
		"type": "bold_close",
		"start": 319,
		"end": 320,
		"match": "*"
	},
	{
		"type": "link_text_open",
		"start": 331,
		"end": 332,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 332,
		"end": 347,
		"match": "migration guide"
	},
	{
		"type": "link_text_close",
		"start": 347,
		"end": 348,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 348,
		"end": 349,
		"match": "("
	},
	{
		"type": "url",
		"start": 349,
		"end": 364,
		"match": "/docs/migrating"
	},
	{
		"type": "url_link",
		"start": 364,
		"end": 365,
		"match": ")"
	},
	{
		"type": "code_open",
		"start": 370,
		"end": 371,
		"match": "`"
	},
	{
		"type": "code",
		"start": 371,
		"end": 374,
		"match": "0.x"
	},
	{
		"type": "code_close",
		"start": 374,
		"end": 375,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 386,
		"end": 389,
		"match": ":::"
	},
	{
		"type": "heading_marker",
		"start": 391,
		"end": 394,
		"match": "## "
	},
	{
		"type": "heading",
		"start": 394,
		"end": 401,
		"match": "Options"
	},
	{
		"type": "punctuation",
		"start": 403,
		"end": 404,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 412,
		"end": 413,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 419,
		"end": 420,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 429,
		"end": 430,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 431,
		"end": 432,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 433,
		"end": 439,
		"match": "------"
	},
	{
		"type": "punctuation",
		"start": 440,
		"end": 441,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 442,
		"end": 446,
		"match": "----"
	},
	{
		"type": "punctuation",
		"start": 447,
		"end": 448,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 449,
		"end": 456,
		"match": "-------"
	},
	{
		"type": "punctuation",
		"start": 457,
		"end": 458,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 459,
		"end": 460,
		"match": "|"
	},
	{
		"type": "code_open",
		"start": 461,
		"end": 462,
		"match": "`"
	},
	{
		"type": "code",
		"start": 462,
		"end": 472,
		"match": "extensions"
	},
	{
		"type": "code_close",
		"start": 472,
		"end": 473,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 474,
		"end": 475,
		"match": "|"
	},
	{
		"type": "code_open",
		"start": 476,
		"end": 477,
		"match": "`"
	},
	{
		"type": "code",
		"start": 477,
		"end": 485,
		"match": "string[]"
	},
	{
		"type": "code_close",
		"start": 485,
		"end": 486,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 487,
		"end": 488,
		"match": "|"
	},
	{
		"type": "code_open",
		"start": 489,
		"end": 490,
		"match": "`"
	},
	{
		"type": "code",
		"start": 490,
		"end": 498,
		"match": "[\".svx\"]"
	},
	{
		"type": "code_close",
		"start": 498,
		"end": 499,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 500,
		"end": 501,
		"match": "|"
	},
	{
		"type": "punctuation",
		"start": 502,
		"end": 503,
		"match": "|"
	},
	{
		"type": "code_open",
		"start": 504,
		"end": 505,
		"match": "`"
	},
	{
		"type": "code",
		"start": 505,
		"end": 518,
		"match": "unwrap_images"
	},
	{
		"type": "code_close",
		"start": 518,
		"end": 519,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 520,
		"end": 521,
		"match": "|"
	},
	{
		"type": "code_open",
		"start": 522,
		"end": 523,
		"match": "`"
	},
	{
		"type": "code",
		"start": 523,
		"end": 530,
		"match": "boolean"
	},
	{
		"type": "code_close",
		"start": 530,
		"end": 531,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 532,
		"end": 533,
		"match": "|"
	},
	{
		"type": "code_open",
		"start": 534,
		"end": 535,
		"match": "`"
	},
	{
		"type": "code",
		"start": 535,
		"end": 540,
		"match": "false"
	},
	{
		"type": "code_close",
		"start": 540,
		"end": 541,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 542,
		"end": 543,
		"match": "|"
	},
	{
		"type": "list_marker",
		"start": 545,
		"end": 546,
		"match": "1"
	},
	{
		"type": "list_marker",
		"start": 546,
		"end": 548,
		"match": ". "
	},
	{
		"type": "code_open",
		"start": 572,
		"end": 573,
		"match": "`"
	},
	{
		"type": "code",
		"start": 573,
		"end": 589,
		"match": "svelte.config.js"
	},
	{
		"type": "code_close",
		"start": 589,
		"end": 590,
		"match": "`"
	},
	{
		"type": "list_marker",
		"start": 591,
		"end": 592,
		"match": "2"
	},
	{
		"type": "list_marker",
		"start": 592,
		"end": 594,
		"match": ". "
	},
	{
		"type": "code_open",
		"start": 603,
		"end": 604,
		"match": "`"
	},
	{
		"type": "code",
		"start": 604,
		"end": 608,
		"match": ".svx"
	},
	{
		"type": "code_close",
		"start": 608,
		"end": 609,
		"match": "`"
	},
	{
		"type": "list_marker",
		"start": 615,
		"end": 616,
		"match": "3"
	},
	{
		"type": "list_marker",
		"start": 616,
		"end": 618,
		"match": ". "
	},
	{
		"type": "code_open",
		"start": 646,
		"end": 647,
		"match": "`"
	},
	{
		"type": "code",
		"start": 647,
		"end": 674,
		"match": "import Doc from './doc.svx'"
	},
	{
		"type": "code_close",
		"start": 674,
		"end": 675,
		"match": "`"
	},
	{
		"type": "punctuation",
		"start": 677,
		"end": 678,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 678,
		"end": 682,
		"match": "Tabs"
	},
	{
		"type": "attr_name",
		"start": 683,
		"end": 688,
		"match": "items"
	},
	{
		"type": "operator",
		"start": 688,
		"end": 689,
		"match": "="
	},
	{
		"type": "expression",
		"start": 689,
		"end": 690,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 690,
		"end": 705,
		"match": "[\"npm\", \"pnpm\"]"
	},
	{
		"type": "expression",
		"start": 705,
		"end": 706,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 706,
		"end": 707,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 710,
		"end": 711,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 711,
		"end": 712,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 712,
		"end": 719,
		"match": "snippet"
	},
	{
		"type": "raw_svelte_expression",
		"start": 719,
		"end": 729,
		"match": " tab(name)"
	},
	{
		"type": "expression",
		"start": 729,
		"end": 730,
		"match": "}"
	},
	{
		"type": "code_open",
		"start": 739,
		"end": 740,
		"match": "`"
	},
	{
		"type": "code",
		"start": 740,
		"end": 754,
		"match": "{name} install"
	},
	{
		"type": "code_close",
		"start": 754,
		"end": 755,
		"match": "`"
	},
	{
		"type": "expression",
		"start": 759,
		"end": 760,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 760,
		"end": 761,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 761,
		"end": 768,
		"match": "snippet"
	},
	{
		"type": "expression",
		"start": 768,
		"end": 769,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 770,
		"end": 772,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 772,
		"end": 776,
		"match": "Tabs"
	},
	{
		"type": "punctuation",
		"start": 776,
		"end": 777,
		"match": ">"
	},
	{
		"type": "blockquote_marker",
		"start": 779,
		"end": 780,
		"match": ">"
	},
	{
		"type": "code_open",
		"start": 787,
		"end": 788,
		"match": "`"
	},
	{
		"type": "code",
		"start": 788,
		"end": 789,
		"match": "{"
	},
	{
		"type": "code_close",
		"start": 789,
		"end": 790,
		"match": "`"
	},
	{
		"type": "code_open",
		"start": 795,
		"end": 796,
		"match": "`"
	},
	{
		"type": "code",
		"start": 796,
		"end": 797,
		"match": "}"
	},
	{
		"type": "code_close",
		"start": 797,
		"end": 798,
		"match": "`"
	},
	{
		"type": "code_open",
		"start": 822,
		"end": 823,
		"match": "`"
	},
	{
		"type": "code",
		"start": 823,
		"end": 825,
		"match": "\\{"
	},
	{
		"type": "code_close",
		"start": 825,
		"end": 826,
		"match": "`"
	},
	{
		"type": "link_text_open",
		"start": 841,
		"end": 843,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 843,
		"end": 846,
		"match": "why"
	},
	{
		"type": "link_text_close",
		"start": 846,
		"end": 847,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 847,
		"end": 848,
		"match": ":"
	},
	{
		"type": "link_text_open",
		"start": 866,
		"end": 867,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 867,
		"end": 872,
		"match": "demos"
	},
	{
		"type": "link_text_close",
		"start": 872,
		"end": 873,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 873,
		"end": 874,
		"match": "("
	},
	{
		"type": "url",
		"start": 874,
		"end": 880,
		"match": "id=abc"
	},
	{
		"type": "url_link",
		"start": 880,
		"end": 881,
		"match": ")"
	}
];
