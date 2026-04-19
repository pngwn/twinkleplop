export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 230,
		"match": "# ============================================================\n# EDGE CASE FILE 1: Strings and Numerics\n# Sources: toml-test spec-1.0.0 generated tests + manual tests\n# ============================================================\n"
	},
	{
		"type": "comment",
		"start": 231,
		"end": 292,
		"match": "# --- (1) Multi-line basic strings with escape sequences ---\n"
	},
	{
		"type": "comment",
		"start": 293,
		"end": 356,
		"match": "# From spec-1.0.0/string-0: basic string with all escape types\n"
	},
	{
		"type": "property",
		"start": 356,
		"end": 365,
		"match": "basic_esc"
	},
	{
		"type": "operator",
		"start": 366,
		"end": 367,
		"match": "="
	},
	{
		"type": "string",
		"start": 368,
		"end": 383,
		"match": "\"I'm a string. "
	},
	{
		"type": "string_escape",
		"start": 383,
		"end": 385,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 385,
		"end": 401,
		"match": "You can quote me"
	},
	{
		"type": "string_escape",
		"start": 401,
		"end": 403,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 403,
		"end": 409,
		"match": ". Name"
	},
	{
		"type": "string_escape",
		"start": 409,
		"end": 411,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 411,
		"end": 414,
		"match": "Jos"
	},
	{
		"type": "string_escape",
		"start": 414,
		"end": 422,
		"match": "\\u00E9\\n"
	},
	{
		"type": "string",
		"start": 422,
		"end": 430,
		"match": "Location"
	},
	{
		"type": "string_escape",
		"start": 430,
		"end": 432,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 432,
		"end": 436,
		"match": "SF.\""
	},
	{
		"type": "comment",
		"start": 438,
		"end": 496,
		"match": "# From spec-1.0.0/string-1: simple multiline basic string\n"
	},
	{
		"type": "property",
		"start": 496,
		"end": 500,
		"match": "str1"
	},
	{
		"type": "operator",
		"start": 501,
		"end": 502,
		"match": "="
	},
	{
		"type": "string",
		"start": 503,
		"end": 540,
		"match": "\"\"\"\nRoses are red\nViolets are blue\"\"\""
	},
	{
		"type": "comment",
		"start": 542,
		"end": 653,
		"match": "# From spec-1.0.0/string-3: line-ending backslash trims whitespace\n# These three are byte-for-byte equivalent:\n"
	},
	{
		"type": "property",
		"start": 653,
		"end": 657,
		"match": "str2"
	},
	{
		"type": "operator",
		"start": 658,
		"end": 659,
		"match": "="
	},
	{
		"type": "string",
		"start": 660,
		"end": 680,
		"match": "\"\"\"\nThe quick brown "
	},
	{
		"type": "string_escape",
		"start": 680,
		"end": 682,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 682,
		"end": 700,
		"match": "\n  fox jumps over "
	},
	{
		"type": "string_escape",
		"start": 700,
		"end": 702,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 702,
		"end": 722,
		"match": "    the lazy dog.\"\"\""
	},
	{
		"type": "property",
		"start": 724,
		"end": 728,
		"match": "str3"
	},
	{
		"type": "operator",
		"start": 729,
		"end": 730,
		"match": "="
	},
	{
		"type": "string",
		"start": 731,
		"end": 734,
		"match": "\"\"\""
	},
	{
		"type": "string_escape",
		"start": 734,
		"end": 736,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 736,
		"end": 756,
		"match": "    The quick brown "
	},
	{
		"type": "string_escape",
		"start": 756,
		"end": 758,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 758,
		"end": 775,
		"match": "  fox jumps over "
	},
	{
		"type": "string_escape",
		"start": 775,
		"end": 777,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 777,
		"end": 794,
		"match": "    the lazy dog."
	},
	{
		"type": "string_escape",
		"start": 794,
		"end": 796,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 796,
		"end": 801,
		"match": "  \"\"\""
	},
	{
		"type": "comment",
		"start": 803,
		"end": 879,
		"match": "# From tests/valid/string/multiline.toml: whitespace after backslash at EOL\n"
	},
	{
		"type": "property",
		"start": 879,
		"end": 898,
		"match": "whitespace_after_bs"
	},
	{
		"type": "operator",
		"start": 899,
		"end": 900,
		"match": "="
	},
	{
		"type": "string",
		"start": 901,
		"end": 904,
		"match": "\"\"\""
	},
	{
		"type": "string_escape",
		"start": 904,
		"end": 906,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 906,
		"end": 926,
		"match": "    The quick brown "
	},
	{
		"type": "string_escape",
		"start": 926,
		"end": 928,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 928,
		"end": 945,
		"match": "  fox jumps over "
	},
	{
		"type": "string_escape",
		"start": 945,
		"end": 947,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 947,
		"end": 964,
		"match": "    the lazy dog."
	},
	{
		"type": "string_escape",
		"start": 964,
		"end": 966,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 966,
		"end": 971,
		"match": "  \"\"\""
	},
	{
		"type": "comment",
		"start": 973,
		"end": 1099,
		"match": "# From tests/valid/string/multiline.toml: backslash escape edge cases\n# a followed by escaped backslash, then newline, then b\n"
	},
	{
		"type": "property",
		"start": 1099,
		"end": 1110,
		"match": "escape_bs_1"
	},
	{
		"type": "operator",
		"start": 1111,
		"end": 1112,
		"match": "="
	},
	{
		"type": "string",
		"start": 1113,
		"end": 1118,
		"match": "\"\"\"a "
	},
	{
		"type": "string_escape",
		"start": 1118,
		"end": 1120,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 1120,
		"end": 1125,
		"match": "\nb\"\"\""
	},
	{
		"type": "comment",
		"start": 1127,
		"end": 1199,
		"match": "# a followed by escaped backslash + line-continuation backslash, then b\n"
	},
	{
		"type": "property",
		"start": 1199,
		"end": 1210,
		"match": "escape_bs_2"
	},
	{
		"type": "operator",
		"start": 1211,
		"end": 1212,
		"match": "="
	},
	{
		"type": "string",
		"start": 1213,
		"end": 1218,
		"match": "\"\"\"a "
	},
	{
		"type": "string_escape",
		"start": 1218,
		"end": 1222,
		"match": "\\\\\\\\"
	},
	{
		"type": "string",
		"start": 1222,
		"end": 1227,
		"match": "\nb\"\"\""
	},
	{
		"type": "comment",
		"start": 1229,
		"end": 1302,
		"match": "# a followed by two escaped backslashes, then whitespace+newline, then b\n"
	},
	{
		"type": "property",
		"start": 1302,
		"end": 1313,
		"match": "escape_bs_3"
	},
	{
		"type": "operator",
		"start": 1314,
		"end": 1315,
		"match": "="
	},
	{
		"type": "string",
		"start": 1316,
		"end": 1321,
		"match": "\"\"\"a "
	},
	{
		"type": "string_escape",
		"start": 1321,
		"end": 1327,
		"match": "\\\\\\\\\\\n"
	},
	{
		"type": "string",
		"start": 1327,
		"end": 1333,
		"match": "  b\"\"\""
	},
	{
		"type": "comment",
		"start": 1335,
		"end": 1406,
		"match": "# From spec-1.0.0/string-4: embedded quotes in multiline basic strings\n"
	},
	{
		"type": "property",
		"start": 1406,
		"end": 1410,
		"match": "str4"
	},
	{
		"type": "operator",
		"start": 1411,
		"end": 1412,
		"match": "="
	},
	{
		"type": "string",
		"start": 1413,
		"end": 1467,
		"match": "\"\"\"Here are two quotation marks: \"\". Simple enough.\"\"\""
	},
	{
		"type": "property",
		"start": 1468,
		"end": 1472,
		"match": "str5"
	},
	{
		"type": "operator",
		"start": 1473,
		"end": 1474,
		"match": "="
	},
	{
		"type": "string",
		"start": 1475,
		"end": 1513,
		"match": "\"\"\"Here are three quotation marks: \"\"\""
	},
	{
		"type": "property",
		"start": 1514,
		"end": 1519,
		"match": "\".\"\"\""
	},
	{
		"type": "property",
		"start": 1520,
		"end": 1524,
		"match": "str6"
	},
	{
		"type": "operator",
		"start": 1525,
		"end": 1526,
		"match": "="
	},
	{
		"type": "string",
		"start": 1527,
		"end": 1566,
		"match": "\"\"\"Here are fifteen quotation marks: \"\""
	},
	{
		"type": "string_escape",
		"start": 1566,
		"end": 1568,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1568,
		"end": 1570,
		"match": "\"\""
	},
	{
		"type": "string_escape",
		"start": 1570,
		"end": 1572,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1572,
		"end": 1574,
		"match": "\"\""
	},
	{
		"type": "string_escape",
		"start": 1574,
		"end": 1576,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1576,
		"end": 1578,
		"match": "\"\""
	},
	{
		"type": "string_escape",
		"start": 1578,
		"end": 1580,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1580,
		"end": 1582,
		"match": "\"\""
	},
	{
		"type": "string_escape",
		"start": 1582,
		"end": 1584,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1584,
		"end": 1588,
		"match": ".\"\"\""
	},
	{
		"type": "comment",
		"start": 1590,
		"end": 1643,
		"match": "# \"This,\" she said, \"is just a pointless statement.\"\n"
	},
	{
		"type": "property",
		"start": 1643,
		"end": 1647,
		"match": "str7"
	},
	{
		"type": "operator",
		"start": 1648,
		"end": 1649,
		"match": "="
	},
	{
		"type": "string",
		"start": 1650,
		"end": 1707,
		"match": "\"\"\"\"This,\" she said, \"is just a pointless statement.\" \"\"\""
	},
	{
		"type": "comment",
		"start": 1709,
		"end": 1774,
		"match": "# From tests/valid/string/multiline-quotes.toml: quote-edge-case\n"
	},
	{
		"type": "property",
		"start": 1774,
		"end": 1777,
		"match": "one"
	},
	{
		"type": "operator",
		"start": 1778,
		"end": 1779,
		"match": "="
	},
	{
		"type": "string",
		"start": 1780,
		"end": 1783,
		"match": "\"\"\""
	},
	{
		"type": "string_escape",
		"start": 1783,
		"end": 1785,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1785,
		"end": 1797,
		"match": "one quote\"\"\""
	},
	{
		"type": "property",
		"start": 1798,
		"end": 1801,
		"match": "two"
	},
	{
		"type": "operator",
		"start": 1802,
		"end": 1803,
		"match": "="
	},
	{
		"type": "string",
		"start": 1804,
		"end": 1807,
		"match": "\"\"\""
	},
	{
		"type": "string_escape",
		"start": 1807,
		"end": 1811,
		"match": "\\\"\\\""
	},
	{
		"type": "string",
		"start": 1811,
		"end": 1824,
		"match": "two quotes\"\"\""
	},
	{
		"type": "property",
		"start": 1825,
		"end": 1834,
		"match": "one_space"
	},
	{
		"type": "operator",
		"start": 1835,
		"end": 1836,
		"match": "="
	},
	{
		"type": "string",
		"start": 1837,
		"end": 1856,
		"match": "\"\"\" \"one quote\" \"\"\""
	},
	{
		"type": "property",
		"start": 1857,
		"end": 1866,
		"match": "two_space"
	},
	{
		"type": "operator",
		"start": 1867,
		"end": 1868,
		"match": "="
	},
	{
		"type": "string",
		"start": 1869,
		"end": 1891,
		"match": "\"\"\" \"\"two quotes\"\" \"\"\""
	},
	{
		"type": "comment",
		"start": 1893,
		"end": 1974,
		"match": "# Three opening \"\"\", then one escaped \", then two \"\" (allowed), then closing \"\"\"\n"
	},
	{
		"type": "property",
		"start": 1974,
		"end": 1981,
		"match": "escaped"
	},
	{
		"type": "operator",
		"start": 1982,
		"end": 1983,
		"match": "="
	},
	{
		"type": "string",
		"start": 1984,
		"end": 1990,
		"match": "\"\"\"lol"
	},
	{
		"type": "string_escape",
		"start": 1990,
		"end": 1992,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 1992,
		"end": 1998,
		"match": "\"\" \"\"\""
	},
	{
		"type": "property",
		"start": 2000,
		"end": 2009,
		"match": "mismatch1"
	},
	{
		"type": "operator",
		"start": 2010,
		"end": 2011,
		"match": "="
	},
	{
		"type": "string",
		"start": 2012,
		"end": 2027,
		"match": "\"\"\"aaa'''bbb\"\"\""
	},
	{
		"type": "comment",
		"start": 2029,
		"end": 2070,
		"match": "# --- (2) Multi-line literal strings ---\n"
	},
	{
		"type": "comment",
		"start": 2071,
		"end": 2129,
		"match": "# From spec-1.0.0/string-5: literal strings (no escaping)\n"
	},
	{
		"type": "property",
		"start": 2129,
		"end": 2136,
		"match": "winpath"
	},
	{
		"type": "operator",
		"start": 2137,
		"end": 2138,
		"match": "="
	},
	{
		"type": "string",
		"start": 2139,
		"end": 2166,
		"match": "'C:\\Users\\nodejs\\templates'"
	},
	{
		"type": "property",
		"start": 2167,
		"end": 2175,
		"match": "winpath2"
	},
	{
		"type": "operator",
		"start": 2176,
		"end": 2177,
		"match": "="
	},
	{
		"type": "string",
		"start": 2178,
		"end": 2206,
		"match": "'\\\\ServerX\\admin$\\system32\\'"
	},
	{
		"type": "property",
		"start": 2207,
		"end": 2213,
		"match": "quoted"
	},
	{
		"type": "operator",
		"start": 2214,
		"end": 2215,
		"match": "="
	},
	{
		"type": "string",
		"start": 2216,
		"end": 2243,
		"match": "'Tom \"Dubs\" Preston-Werner'"
	},
	{
		"type": "property",
		"start": 2244,
		"end": 2249,
		"match": "regex"
	},
	{
		"type": "operator",
		"start": 2250,
		"end": 2251,
		"match": "="
	},
	{
		"type": "string",
		"start": 2252,
		"end": 2264,
		"match": "'<\\i\\c*\\s*>'"
	},
	{
		"type": "comment",
		"start": 2266,
		"end": 2321,
		"match": "# From spec-1.0.0/string-6: multi-line literal strings\n"
	},
	{
		"type": "property",
		"start": 2321,
		"end": 2327,
		"match": "regex2"
	},
	{
		"type": "operator",
		"start": 2328,
		"end": 2329,
		"match": "="
	},
	{
		"type": "string",
		"start": 2330,
		"end": 2364,
		"match": "'''I [dw]on't need \\d{2} apples'''"
	},
	{
		"type": "property",
		"start": 2365,
		"end": 2370,
		"match": "lines"
	},
	{
		"type": "operator",
		"start": 2372,
		"end": 2373,
		"match": "="
	},
	{
		"type": "string",
		"start": 2374,
		"end": 2467,
		"match": "'''\nThe first newline is\ntrimmed in raw strings.\n   All other whitespace\n   is preserved.\n'''"
	},
	{
		"type": "comment",
		"start": 2469,
		"end": 2538,
		"match": "# From spec-1.0.0/string-7: quotes inside multi-line literal strings\n"
	},
	{
		"type": "property",
		"start": 2538,
		"end": 2544,
		"match": "quot15"
	},
	{
		"type": "operator",
		"start": 2545,
		"end": 2546,
		"match": "="
	},
	{
		"type": "string",
		"start": 2547,
		"end": 2602,
		"match": "'''Here are fifteen quotation marks: \"\"\"\"\"\"\"\"\"\"\"\"\"\"\"'''"
	},
	{
		"type": "comment",
		"start": 2604,
		"end": 2646,
		"match": "# 'That,' she said, 'is still pointless.'\n"
	},
	{
		"type": "property",
		"start": 2646,
		"end": 2653,
		"match": "str_lit"
	},
	{
		"type": "operator",
		"start": 2654,
		"end": 2655,
		"match": "="
	},
	{
		"type": "string",
		"start": 2656,
		"end": 2832,
		"match": "''''That,' she said, 'is still pointless.''''\n\n# From tests/valid/string/multiline-quotes.toml: apostrophe-edge-cases\nlit_one = ''''one quote''''\nlit_two = '''''two quotes'''''"
	},
	{
		"type": "property",
		"start": 2833,
		"end": 2846,
		"match": "lit_one_space"
	},
	{
		"type": "operator",
		"start": 2847,
		"end": 2848,
		"match": "="
	},
	{
		"type": "string",
		"start": 2849,
		"end": 2868,
		"match": "''' 'one quote' '''"
	},
	{
		"type": "property",
		"start": 2869,
		"end": 2882,
		"match": "lit_two_space"
	},
	{
		"type": "operator",
		"start": 2883,
		"end": 2884,
		"match": "="
	},
	{
		"type": "string",
		"start": 2885,
		"end": 2907,
		"match": "''' ''two quotes'' '''"
	},
	{
		"type": "property",
		"start": 2909,
		"end": 2918,
		"match": "mismatch2"
	},
	{
		"type": "operator",
		"start": 2919,
		"end": 2920,
		"match": "="
	},
	{
		"type": "string",
		"start": 2921,
		"end": 2936,
		"match": "'''aaa\"\"\"bbb'''"
	},
	{
		"type": "comment",
		"start": 2938,
		"end": 2974,
		"match": "# --- (7) Various numeric forms ---\n"
	},
	{
		"type": "comment",
		"start": 2975,
		"end": 3019,
		"match": "# From spec-1.0.0/integer-0: basic integers\n"
	},
	{
		"type": "property",
		"start": 3019,
		"end": 3023,
		"match": "int1"
	},
	{
		"type": "operator",
		"start": 3024,
		"end": 3025,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3026,
		"end": 3027,
		"match": "+"
	},
	{
		"type": "number",
		"start": 3027,
		"end": 3029,
		"match": "99"
	},
	{
		"type": "property",
		"start": 3030,
		"end": 3034,
		"match": "int2"
	},
	{
		"type": "operator",
		"start": 3035,
		"end": 3036,
		"match": "="
	},
	{
		"type": "number",
		"start": 3037,
		"end": 3039,
		"match": "42"
	},
	{
		"type": "property",
		"start": 3040,
		"end": 3044,
		"match": "int3"
	},
	{
		"type": "operator",
		"start": 3045,
		"end": 3046,
		"match": "="
	},
	{
		"type": "number",
		"start": 3047,
		"end": 3048,
		"match": "0"
	},
	{
		"type": "property",
		"start": 3049,
		"end": 3053,
		"match": "int4"
	},
	{
		"type": "operator",
		"start": 3054,
		"end": 3055,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3056,
		"end": 3057,
		"match": "-"
	},
	{
		"type": "number",
		"start": 3057,
		"end": 3059,
		"match": "17"
	},
	{
		"type": "comment",
		"start": 3061,
		"end": 3114,
		"match": "# From spec-1.0.0/integer-1: underscores in integers\n"
	},
	{
		"type": "property",
		"start": 3114,
		"end": 3118,
		"match": "int5"
	},
	{
		"type": "operator",
		"start": 3119,
		"end": 3120,
		"match": "="
	},
	{
		"type": "number",
		"start": 3121,
		"end": 3126,
		"match": "1_000"
	},
	{
		"type": "property",
		"start": 3127,
		"end": 3131,
		"match": "int6"
	},
	{
		"type": "operator",
		"start": 3132,
		"end": 3133,
		"match": "="
	},
	{
		"type": "number",
		"start": 3134,
		"end": 3143,
		"match": "5_349_221"
	},
	{
		"type": "property",
		"start": 3144,
		"end": 3148,
		"match": "int7"
	},
	{
		"type": "operator",
		"start": 3149,
		"end": 3150,
		"match": "="
	},
	{
		"type": "number",
		"start": 3151,
		"end": 3160,
		"match": "53_49_221"
	},
	{
		"type": "comment",
		"start": 3162,
		"end": 3194,
		"match": "# Indian number system grouping\n"
	},
	{
		"type": "property",
		"start": 3194,
		"end": 3198,
		"match": "int8"
	},
	{
		"type": "operator",
		"start": 3199,
		"end": 3200,
		"match": "="
	},
	{
		"type": "number",
		"start": 3201,
		"end": 3210,
		"match": "1_2_3_4_5"
	},
	{
		"type": "comment",
		"start": 3212,
		"end": 3236,
		"match": "# VALID but discouraged\n"
	},
	{
		"type": "comment",
		"start": 3237,
		"end": 3312,
		"match": "# From spec-1.0.0/integer-2: hex, oct, binary\n# hexadecimal with prefix 0x\n"
	},
	{
		"type": "property",
		"start": 3312,
		"end": 3316,
		"match": "hex1"
	},
	{
		"type": "operator",
		"start": 3317,
		"end": 3318,
		"match": "="
	},
	{
		"type": "number",
		"start": 3319,
		"end": 3329,
		"match": "0xDEADBEEF"
	},
	{
		"type": "property",
		"start": 3330,
		"end": 3334,
		"match": "hex2"
	},
	{
		"type": "operator",
		"start": 3335,
		"end": 3336,
		"match": "="
	},
	{
		"type": "number",
		"start": 3337,
		"end": 3347,
		"match": "0xdeadbeef"
	},
	{
		"type": "property",
		"start": 3348,
		"end": 3352,
		"match": "hex3"
	},
	{
		"type": "operator",
		"start": 3353,
		"end": 3354,
		"match": "="
	},
	{
		"type": "number",
		"start": 3355,
		"end": 3366,
		"match": "0xdead_beef"
	},
	{
		"type": "comment",
		"start": 3368,
		"end": 3391,
		"match": "# octal with prefix 0o\n"
	},
	{
		"type": "property",
		"start": 3391,
		"end": 3395,
		"match": "oct1"
	},
	{
		"type": "operator",
		"start": 3396,
		"end": 3397,
		"match": "="
	},
	{
		"type": "number",
		"start": 3398,
		"end": 3408,
		"match": "0o01234567"
	},
	{
		"type": "property",
		"start": 3409,
		"end": 3413,
		"match": "oct2"
	},
	{
		"type": "operator",
		"start": 3414,
		"end": 3415,
		"match": "="
	},
	{
		"type": "number",
		"start": 3416,
		"end": 3421,
		"match": "0o755"
	},
	{
		"type": "comment",
		"start": 3423,
		"end": 3458,
		"match": "# useful for Unix file permissions\n"
	},
	{
		"type": "comment",
		"start": 3459,
		"end": 3483,
		"match": "# binary with prefix 0b\n"
	},
	{
		"type": "property",
		"start": 3483,
		"end": 3487,
		"match": "bin1"
	},
	{
		"type": "operator",
		"start": 3488,
		"end": 3489,
		"match": "="
	},
	{
		"type": "number",
		"start": 3490,
		"end": 3500,
		"match": "0b11010110"
	},
	{
		"type": "comment",
		"start": 3502,
		"end": 3556,
		"match": "# From spec-1.0.0/float-0: fractional, exponent, both\n"
	},
	{
		"type": "property",
		"start": 3556,
		"end": 3560,
		"match": "flt1"
	},
	{
		"type": "operator",
		"start": 3561,
		"end": 3562,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3563,
		"end": 3564,
		"match": "+"
	},
	{
		"type": "number",
		"start": 3564,
		"end": 3567,
		"match": "1.0"
	},
	{
		"type": "property",
		"start": 3568,
		"end": 3572,
		"match": "flt2"
	},
	{
		"type": "operator",
		"start": 3573,
		"end": 3574,
		"match": "="
	},
	{
		"type": "number",
		"start": 3575,
		"end": 3581,
		"match": "3.1415"
	},
	{
		"type": "property",
		"start": 3582,
		"end": 3586,
		"match": "flt3"
	},
	{
		"type": "operator",
		"start": 3587,
		"end": 3588,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3589,
		"end": 3590,
		"match": "-"
	},
	{
		"type": "number",
		"start": 3590,
		"end": 3594,
		"match": "0.01"
	},
	{
		"type": "property",
		"start": 3595,
		"end": 3599,
		"match": "flt4"
	},
	{
		"type": "operator",
		"start": 3600,
		"end": 3601,
		"match": "="
	},
	{
		"type": "number",
		"start": 3602,
		"end": 3607,
		"match": "5e+22"
	},
	{
		"type": "property",
		"start": 3608,
		"end": 3612,
		"match": "flt5"
	},
	{
		"type": "operator",
		"start": 3613,
		"end": 3614,
		"match": "="
	},
	{
		"type": "number",
		"start": 3615,
		"end": 3619,
		"match": "1e06"
	},
	{
		"type": "property",
		"start": 3620,
		"end": 3624,
		"match": "flt6"
	},
	{
		"type": "operator",
		"start": 3625,
		"end": 3626,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3627,
		"end": 3628,
		"match": "-"
	},
	{
		"type": "number",
		"start": 3628,
		"end": 3632,
		"match": "2E-2"
	},
	{
		"type": "property",
		"start": 3633,
		"end": 3637,
		"match": "flt7"
	},
	{
		"type": "operator",
		"start": 3638,
		"end": 3639,
		"match": "="
	},
	{
		"type": "number",
		"start": 3640,
		"end": 3649,
		"match": "6.626e-34"
	},
	{
		"type": "comment",
		"start": 3651,
		"end": 3699,
		"match": "# From spec-1.0.0/float-1: underscores in float\n"
	},
	{
		"type": "property",
		"start": 3699,
		"end": 3703,
		"match": "flt8"
	},
	{
		"type": "operator",
		"start": 3704,
		"end": 3705,
		"match": "="
	},
	{
		"type": "number",
		"start": 3706,
		"end": 3725,
		"match": "224_617.445_991_228"
	},
	{
		"type": "comment",
		"start": 3727,
		"end": 3782,
		"match": "# From spec-1.0.0/float-2: infinity and NaN\n# infinity\n"
	},
	{
		"type": "property",
		"start": 3782,
		"end": 3785,
		"match": "sf1"
	},
	{
		"type": "operator",
		"start": 3786,
		"end": 3787,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 3788,
		"end": 3791,
		"match": "inf"
	},
	{
		"type": "comment",
		"start": 3794,
		"end": 3814,
		"match": "# positive infinity\n"
	},
	{
		"type": "property",
		"start": 3814,
		"end": 3817,
		"match": "sf2"
	},
	{
		"type": "operator",
		"start": 3818,
		"end": 3819,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3820,
		"end": 3821,
		"match": "+"
	},
	{
		"type": "keyword",
		"start": 3821,
		"end": 3824,
		"match": "inf"
	},
	{
		"type": "comment",
		"start": 3826,
		"end": 3846,
		"match": "# positive infinity\n"
	},
	{
		"type": "property",
		"start": 3846,
		"end": 3849,
		"match": "sf3"
	},
	{
		"type": "operator",
		"start": 3850,
		"end": 3851,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3852,
		"end": 3853,
		"match": "-"
	},
	{
		"type": "keyword",
		"start": 3853,
		"end": 3856,
		"match": "inf"
	},
	{
		"type": "comment",
		"start": 3858,
		"end": 3878,
		"match": "# negative infinity\n"
	},
	{
		"type": "comment",
		"start": 3879,
		"end": 3894,
		"match": "# not a number\n"
	},
	{
		"type": "property",
		"start": 3894,
		"end": 3897,
		"match": "sf4"
	},
	{
		"type": "operator",
		"start": 3898,
		"end": 3899,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 3900,
		"end": 3903,
		"match": "nan"
	},
	{
		"type": "comment",
		"start": 3906,
		"end": 3961,
		"match": "# actual sNaN/qNaN encoding is implementation-specific\n"
	},
	{
		"type": "property",
		"start": 3961,
		"end": 3964,
		"match": "sf5"
	},
	{
		"type": "operator",
		"start": 3965,
		"end": 3966,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3967,
		"end": 3968,
		"match": "+"
	},
	{
		"type": "keyword",
		"start": 3968,
		"end": 3971,
		"match": "nan"
	},
	{
		"type": "comment",
		"start": 3973,
		"end": 3987,
		"match": "# same as nan\n"
	},
	{
		"type": "property",
		"start": 3987,
		"end": 3990,
		"match": "sf6"
	},
	{
		"type": "operator",
		"start": 3991,
		"end": 3992,
		"match": "="
	},
	{
		"type": "operator",
		"start": 3993,
		"end": 3994,
		"match": "-"
	},
	{
		"type": "keyword",
		"start": 3994,
		"end": 3997,
		"match": "nan"
	},
	{
		"type": "comment",
		"start": 3999,
		"end": 4051,
		"match": "# valid, actual encoding is implementation-specific\n"
	},
	{
		"type": "comment",
		"start": 4052,
		"end": 4107,
		"match": "# From tests/valid/float/float.toml: zero integer part\n"
	},
	{
		"type": "property",
		"start": 4107,
		"end": 4119,
		"match": "zero_intpart"
	},
	{
		"type": "operator",
		"start": 4120,
		"end": 4121,
		"match": "="
	},
	{
		"type": "number",
		"start": 4122,
		"end": 4127,
		"match": "0.123"
	},
	{
		"type": "property",
		"start": 4128,
		"end": 4151,
		"match": "leading_zero_fractional"
	},
	{
		"type": "operator",
		"start": 4152,
		"end": 4153,
		"match": "="
	},
	{
		"type": "number",
		"start": 4154,
		"end": 4160,
		"match": "0.0123"
	}
];
