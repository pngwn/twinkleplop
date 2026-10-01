export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 1,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 1,
		"end": 8,
		"match": "include"
	},
	{
		"type": "string",
		"start": 9,
		"end": 22,
		"match": "<string_view>"
	},
	{
		"type": "keyword",
		"start": 23,
		"end": 28,
		"match": "using"
	},
	{
		"type": "keyword",
		"start": 29,
		"end": 38,
		"match": "namespace"
	},
	{
		"type": "identifier",
		"start": 39,
		"end": 42,
		"match": "std"
	},
	{
		"type": "punctuation",
		"start": 42,
		"end": 44,
		"match": "::"
	},
	{
		"type": "identifier",
		"start": 44,
		"end": 52,
		"match": "literals"
	},
	{
		"type": "punctuation",
		"start": 52,
		"end": 53,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 54,
		"end": 63,
		"match": "constexpr"
	},
	{
		"type": "keyword",
		"start": 64,
		"end": 68,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 69,
		"end": 73,
		"match": "size"
	},
	{
		"type": "operator",
		"start": 74,
		"end": 75,
		"match": "="
	},
	{
		"type": "number",
		"start": 76,
		"end": 83,
		"match": "1'024uz"
	},
	{
		"type": "punctuation",
		"start": 83,
		"end": 84,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 85,
		"end": 89,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 90,
		"end": 98,
		"match": "distance"
	},
	{
		"type": "operator",
		"start": 99,
		"end": 100,
		"match": "="
	},
	{
		"type": "number",
		"start": 101,
		"end": 108,
		"match": "12.5_km"
	},
	{
		"type": "punctuation",
		"start": 108,
		"end": 109,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 110,
		"end": 114,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 115,
		"end": 120,
		"match": "scale"
	},
	{
		"type": "operator",
		"start": 121,
		"end": 122,
		"match": "="
	},
	{
		"type": "number",
		"start": 123,
		"end": 132,
		"match": "0x1.fp-2F"
	},
	{
		"type": "operator",
		"start": 133,
		"end": 134,
		"match": "+"
	},
	{
		"type": "number",
		"start": 135,
		"end": 141,
		"match": "1.5f32"
	},
	{
		"type": "punctuation",
		"start": 141,
		"end": 142,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 143,
		"end": 147,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 148,
		"end": 152,
		"match": "text"
	},
	{
		"type": "operator",
		"start": 153,
		"end": 154,
		"match": "="
	},
	{
		"type": "string",
		"start": 155,
		"end": 161,
		"match": "\"plain"
	},
	{
		"type": "string_escape",
		"start": 161,
		"end": 163,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 163,
		"end": 166,
		"match": "\"sv"
	},
	{
		"type": "punctuation",
		"start": 166,
		"end": 167,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 168,
		"end": 172,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 173,
		"end": 179,
		"match": "letter"
	},
	{
		"type": "operator",
		"start": 180,
		"end": 181,
		"match": "="
	},
	{
		"type": "string",
		"start": 182,
		"end": 186,
		"match": "U'λ'"
	},
	{
		"type": "punctuation",
		"start": 186,
		"end": 187,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 188,
		"end": 192,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 193,
		"end": 196,
		"match": "raw"
	},
	{
		"type": "operator",
		"start": 197,
		"end": 198,
		"match": "="
	},
	{
		"type": "string",
		"start": 199,
		"end": 252,
		"match": "R\"json({\"key\": \")\\\"\", \"comment\": \"/*literal*/\"})json\""
	},
	{
		"type": "punctuation",
		"start": 252,
		"end": 253,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 254,
		"end": 258,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 259,
		"end": 264,
		"match": "regex"
	},
	{
		"type": "operator",
		"start": 265,
		"end": 266,
		"match": "="
	},
	{
		"type": "string",
		"start": 267,
		"end": 321,
		"match": "u8R\"pattern(\\d+\\s+\"quoted\"\n)wrong\" still raw )pattern\""
	},
	{
		"type": "punctuation",
		"start": 321,
		"end": 322,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 323,
		"end": 327,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 328,
		"end": 343,
		"match": "empty_delimiter"
	},
	{
		"type": "operator",
		"start": 344,
		"end": 345,
		"match": "="
	},
	{
		"type": "string",
		"start": 346,
		"end": 358,
		"match": "R\"(a\\n(b)c)\""
	},
	{
		"type": "punctuation",
		"start": 358,
		"end": 359,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 360,
		"end": 364,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 365,
		"end": 369,
		"match": "wide"
	},
	{
		"type": "operator",
		"start": 370,
		"end": 371,
		"match": "="
	},
	{
		"type": "string",
		"start": 372,
		"end": 384,
		"match": "LR\"x(wide)x\""
	},
	{
		"type": "punctuation",
		"start": 384,
		"end": 385,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 386,
		"end": 390,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 391,
		"end": 396,
		"match": "utf16"
	},
	{
		"type": "operator",
		"start": 397,
		"end": 398,
		"match": "="
	},
	{
		"type": "string",
		"start": 399,
		"end": 412,
		"match": "uR\"x(utf16)x\""
	},
	{
		"type": "punctuation",
		"start": 412,
		"end": 413,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 414,
		"end": 418,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 419,
		"end": 424,
		"match": "utf32"
	},
	{
		"type": "operator",
		"start": 425,
		"end": 426,
		"match": "="
	},
	{
		"type": "string",
		"start": 427,
		"end": 445,
		"match": "UR\"x(utf32)x\"_text"
	},
	{
		"type": "punctuation",
		"start": 445,
		"end": 446,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 447,
		"end": 451,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 452,
		"end": 459,
		"match": "escapes"
	},
	{
		"type": "operator",
		"start": 460,
		"end": 461,
		"match": "="
	},
	{
		"type": "string",
		"start": 462,
		"end": 463,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 463,
		"end": 464,
		"match": "\\"
	},
	{
		"type": "string_escape",
		"start": 464,
		"end": 470,
		"match": "x{41}\\"
	},
	{
		"type": "string_escape",
		"start": 470,
		"end": 479,
		"match": "u{1F600}\\"
	},
	{
		"type": "string_escape",
		"start": 479,
		"end": 486,
		"match": "o{101}\\"
	},
	{
		"type": "string_escape",
		"start": 486,
		"end": 511,
		"match": "N{LATIN CAPITAL LETTER A}"
	},
	{
		"type": "string",
		"start": 511,
		"end": 512,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 512,
		"end": 513,
		"match": ";"
	}
];
