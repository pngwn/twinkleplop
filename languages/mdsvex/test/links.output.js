export const test = [
	{
		"type": "link_text_open",
		"start": 0,
		"end": 1,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 1,
		"end": 7,
		"match": "a link"
	},
	{
		"type": "link_text_close",
		"start": 7,
		"end": 8,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 8,
		"end": 9,
		"match": "("
	},
	{
		"type": "url",
		"start": 9,
		"end": 28,
		"match": "https://example.com"
	},
	{
		"type": "url_link",
		"start": 28,
		"end": 29,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 34,
		"end": 35,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 35,
		"end": 45,
		"match": "with title"
	},
	{
		"type": "link_text_close",
		"start": 45,
		"end": 46,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 46,
		"end": 47,
		"match": "("
	},
	{
		"type": "url",
		"start": 47,
		"end": 52,
		"match": "/url "
	},
	{
		"type": "url_title",
		"start": 52,
		"end": 63,
		"match": "\"the title\""
	},
	{
		"type": "url_link",
		"start": 63,
		"end": 64,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 69,
		"end": 70,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 70,
		"end": 76,
		"match": "single"
	},
	{
		"type": "link_text_close",
		"start": 76,
		"end": 77,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 77,
		"end": 78,
		"match": "("
	},
	{
		"type": "url",
		"start": 78,
		"end": 81,
		"match": "/u "
	},
	{
		"type": "url_title",
		"start": 81,
		"end": 84,
		"match": "'x'"
	},
	{
		"type": "url_link",
		"start": 84,
		"end": 85,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 87,
		"end": 89,
		"match": "!["
	},
	{
		"type": "link_text",
		"start": 89,
		"end": 97,
		"match": "an image"
	},
	{
		"type": "link_text_close",
		"start": 97,
		"end": 98,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 98,
		"end": 99,
		"match": "("
	},
	{
		"type": "url",
		"start": 99,
		"end": 109,
		"match": "/chart.png"
	},
	{
		"type": "url_link",
		"start": 109,
		"end": 110,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 115,
		"end": 116,
		"match": "["
	},
	{
		"type": "link_text_open",
		"start": 116,
		"end": 118,
		"match": "!["
	},
	{
		"type": "link_text",
		"start": 118,
		"end": 130,
		"match": "linked image"
	},
	{
		"type": "link_text_close",
		"start": 130,
		"end": 131,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 131,
		"end": 132,
		"match": "("
	},
	{
		"type": "url",
		"start": 132,
		"end": 142,
		"match": "/chart.png"
	},
	{
		"type": "url_link",
		"start": 142,
		"end": 143,
		"match": ")"
	},
	{
		"type": "link_text_close",
		"start": 143,
		"end": 144,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 144,
		"end": 145,
		"match": "("
	},
	{
		"type": "url",
		"start": 145,
		"end": 154,
		"match": "/full.png"
	},
	{
		"type": "url_link",
		"start": 154,
		"end": 155,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 157,
		"end": 158,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 158,
		"end": 165,
		"match": "escaped"
	},
	{
		"type": "link_text_close",
		"start": 165,
		"end": 166,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 166,
		"end": 167,
		"match": "("
	},
	{
		"type": "url",
		"start": 167,
		"end": 169,
		"match": "/u"
	},
	{
		"type": "escape",
		"start": 169,
		"end": 171,
		"match": "\\)"
	},
	{
		"type": "url",
		"start": 171,
		"end": 173,
		"match": "b "
	},
	{
		"type": "url_title",
		"start": 173,
		"end": 181,
		"match": "\"t \\\" u\""
	},
	{
		"type": "url_link",
		"start": 181,
		"end": 182,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 187,
		"end": 188,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 188,
		"end": 195,
		"match": "dynamic"
	},
	{
		"type": "link_text_close",
		"start": 195,
		"end": 196,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 196,
		"end": 197,
		"match": "("
	},
	{
		"type": "url",
		"start": 197,
		"end": 203,
		"match": "/docs/"
	},
	{
		"type": "expression",
		"start": 203,
		"end": 204,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 204,
		"end": 208,
		"match": "slug"
	},
	{
		"type": "expression",
		"start": 208,
		"end": 209,
		"match": "}"
	},
	{
		"type": "url_link",
		"start": 209,
		"end": 210,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 212,
		"end": 213,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 213,
		"end": 216,
		"match": "ref"
	},
	{
		"type": "link_text_close",
		"start": 216,
		"end": 217,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 217,
		"end": 218,
		"match": ":"
	},
	{
		"type": "url",
		"start": 219,
		"end": 238,
		"match": "https://example.com"
	},
	{
		"type": "url_title",
		"start": 239,
		"end": 246,
		"match": "\"Title\""
	},
	{
		"type": "link_text_open",
		"start": 247,
		"end": 248,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 248,
		"end": 257,
		"match": "other ref"
	},
	{
		"type": "link_text_close",
		"start": 257,
		"end": 258,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 258,
		"end": 259,
		"match": ":"
	},
	{
		"type": "url",
		"start": 260,
		"end": 267,
		"match": "</angle"
	},
	{
		"type": "url",
		"start": 268,
		"end": 272,
		"match": "url>"
	},
	{
		"type": "link_text_open",
		"start": 274,
		"end": 275,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 275,
		"end": 279,
		"match": "text"
	},
	{
		"type": "link_text_close",
		"start": 279,
		"end": 280,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 280,
		"end": 281,
		"match": "["
	},
	{
		"type": "property",
		"start": 281,
		"end": 284,
		"match": "ref"
	},
	{
		"type": "url_link",
		"start": 284,
		"end": 285,
		"match": "]"
	},
	{
		"type": "link_text_open",
		"start": 290,
		"end": 291,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 291,
		"end": 294,
		"match": "ref"
	},
	{
		"type": "link_text_close",
		"start": 294,
		"end": 295,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 295,
		"end": 297,
		"match": "[]"
	},
	{
		"type": "link_text_open",
		"start": 302,
		"end": 304,
		"match": "!["
	},
	{
		"type": "link_text",
		"start": 304,
		"end": 307,
		"match": "alt"
	},
	{
		"type": "link_text_close",
		"start": 307,
		"end": 308,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 308,
		"end": 309,
		"match": "["
	},
	{
		"type": "property",
		"start": 309,
		"end": 312,
		"match": "ref"
	},
	{
		"type": "url_link",
		"start": 312,
		"end": 313,
		"match": "]"
	},
	{
		"type": "autolink_open",
		"start": 360,
		"end": 361,
		"match": "<"
	},
	{
		"type": "autolink",
		"start": 361,
		"end": 380,
		"match": "https://example.com"
	},
	{
		"type": "autolink_close",
		"start": 380,
		"end": 381,
		"match": ">"
	},
	{
		"type": "autolink_open",
		"start": 386,
		"end": 387,
		"match": "<"
	},
	{
		"type": "autolink",
		"start": 387,
		"end": 413,
		"match": "mailto:someone@example.com"
	},
	{
		"type": "autolink_close",
		"start": 413,
		"end": 414,
		"match": ">"
	},
	{
		"type": "link_text_open",
		"start": 437,
		"end": 439,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 439,
		"end": 440,
		"match": "1"
	},
	{
		"type": "link_text_close",
		"start": 440,
		"end": 441,
		"match": "]"
	},
	{
		"type": "link_text_open",
		"start": 459,
		"end": 461,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 461,
		"end": 466,
		"match": "smith"
	},
	{
		"type": "link_text_close",
		"start": 466,
		"end": 467,
		"match": "]"
	},
	{
		"type": "link_text_open",
		"start": 470,
		"end": 472,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 472,
		"end": 473,
		"match": "1"
	},
	{
		"type": "link_text_close",
		"start": 473,
		"end": 474,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 474,
		"end": 475,
		"match": ":"
	},
	{
		"type": "link_text_open",
		"start": 495,
		"end": 496,
		"match": "["
	},
	{
		"type": "link_text",
		"start": 496,
		"end": 500,
		"match": "link"
	},
	{
		"type": "link_text_close",
		"start": 500,
		"end": 501,
		"match": "]"
	},
	{
		"type": "url_link",
		"start": 501,
		"end": 502,
		"match": "("
	},
	{
		"type": "url",
		"start": 502,
		"end": 521,
		"match": "https://example.com"
	},
	{
		"type": "url_link",
		"start": 521,
		"end": 522,
		"match": ")"
	},
	{
		"type": "link_text_open",
		"start": 524,
		"end": 526,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 526,
		"end": 531,
		"match": "smith"
	},
	{
		"type": "link_text_close",
		"start": 531,
		"end": 532,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 532,
		"end": 533,
		"match": ":"
	},
	{
		"type": "link_text_open",
		"start": 547,
		"end": 549,
		"match": "[^"
	},
	{
		"type": "link_text",
		"start": 549,
		"end": 554,
		"match": "block"
	},
	{
		"type": "link_text_close",
		"start": 554,
		"end": 555,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 555,
		"end": 556,
		"match": ":"
	},
	{
		"type": "heading_marker",
		"start": 561,
		"end": 563,
		"match": "# "
	},
	{
		"type": "heading",
		"start": 563,
		"end": 586,
		"match": "A heading in a footnote"
	},
	{
		"type": "entity",
		"start": 588,
		"end": 593,
		"match": "&amp;"
	},
	{
		"type": "entity",
		"start": 594,
		"end": 600,
		"match": "&#123;"
	},
	{
		"type": "entity",
		"start": 601,
		"end": 607,
		"match": "&#x7D;"
	},
	{
		"type": "entity",
		"start": 608,
		"end": 614,
		"match": "&copy;"
	}
];
