export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 2,
		"match": "dq"
	},
	{
		"type": "operator",
		"start": 3,
		"end": 4,
		"match": "="
	},
	{
		"type": "string",
		"start": 5,
		"end": 20,
		"match": "\"double quoted\""
	},
	{
		"type": "property",
		"start": 21,
		"end": 23,
		"match": "sq"
	},
	{
		"type": "operator",
		"start": 24,
		"end": 25,
		"match": "="
	},
	{
		"type": "string",
		"start": 26,
		"end": 41,
		"match": "'single quoted'"
	},
	{
		"type": "property",
		"start": 42,
		"end": 46,
		"match": "lead"
	},
	{
		"type": "operator",
		"start": 46,
		"end": 47,
		"match": "="
	},
	{
		"type": "string",
		"start": 47,
		"end": 74,
		"match": "'no space before the quote'"
	},
	{
		"type": "property",
		"start": 75,
		"end": 82,
		"match": "escapes"
	},
	{
		"type": "operator",
		"start": 83,
		"end": 84,
		"match": "="
	},
	{
		"type": "string",
		"start": 85,
		"end": 89,
		"match": "\"tab"
	},
	{
		"type": "string_escape",
		"start": 89,
		"end": 91,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 91,
		"end": 99,
		"match": " newline"
	},
	{
		"type": "string_escape",
		"start": 99,
		"end": 101,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 101,
		"end": 107,
		"match": " quote"
	},
	{
		"type": "string_escape",
		"start": 107,
		"end": 109,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 109,
		"end": 119,
		"match": " backslash"
	},
	{
		"type": "string_escape",
		"start": 119,
		"end": 121,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 121,
		"end": 126,
		"match": " end\""
	},
	{
		"type": "property",
		"start": 127,
		"end": 135,
		"match": "adjacent"
	},
	{
		"type": "operator",
		"start": 136,
		"end": 137,
		"match": "="
	},
	{
		"type": "string",
		"start": 138,
		"end": 139,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 139,
		"end": 141,
		"match": "\\\""
	},
	{
		"type": "string_escape",
		"start": 141,
		"end": 143,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 143,
		"end": 144,
		"match": "\""
	},
	{
		"type": "property",
		"start": 145,
		"end": 148,
		"match": "mid"
	},
	{
		"type": "operator",
		"start": 149,
		"end": 150,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 151,
		"end": 152,
		"match": "!"
	},
	{
		"type": "string",
		"start": 152,
		"end": 173,
		"match": "\"quoted after a bang\""
	},
	{
		"type": "property",
		"start": 174,
		"end": 176,
		"match": "go"
	},
	{
		"type": "operator",
		"start": 177,
		"end": 178,
		"match": "="
	},
	{
		"type": "string",
		"start": 179,
		"end": 203,
		"match": "\"!f() { git checkout -b "
	},
	{
		"type": "string_escape",
		"start": 203,
		"end": 205,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 205,
		"end": 207,
		"match": "$1"
	},
	{
		"type": "string_escape",
		"start": 207,
		"end": 209,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 209,
		"end": 216,
		"match": "; }; f\""
	},
	{
		"type": "property",
		"start": 217,
		"end": 221,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 222,
		"end": 223,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 224,
		"end": 229,
		"match": "Don't"
	},
	{
		"type": "plain_scalar",
		"start": 230,
		"end": 235,
		"match": "panic"
	},
	{
		"type": "property",
		"start": 236,
		"end": 246,
		"match": "possessive"
	},
	{
		"type": "operator",
		"start": 247,
		"end": 248,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 249,
		"end": 252,
		"match": "the"
	},
	{
		"type": "plain_scalar",
		"start": 253,
		"end": 259,
		"match": "user's"
	},
	{
		"type": "plain_scalar",
		"start": 260,
		"end": 264,
		"match": "file"
	},
	{
		"type": "property",
		"start": 265,
		"end": 268,
		"match": "esc"
	},
	{
		"type": "operator",
		"start": 269,
		"end": 270,
		"match": "="
	},
	{
		"type": "string",
		"start": 271,
		"end": 276,
		"match": "'it\\'"
	},
	{
		"type": "plain_scalar",
		"start": 276,
		"end": 278,
		"match": "s'"
	},
	{
		"type": "property",
		"start": 279,
		"end": 284,
		"match": "multi"
	},
	{
		"type": "operator",
		"start": 285,
		"end": 286,
		"match": "="
	},
	{
		"type": "string",
		"start": 287,
		"end": 290,
		"match": "'a'"
	},
	{
		"type": "string",
		"start": 291,
		"end": 294,
		"match": "\"b\""
	},
	{
		"type": "string",
		"start": 295,
		"end": 297,
		"match": "'c"
	},
	{
		"type": "property",
		"start": 298,
		"end": 302,
		"match": "open"
	},
	{
		"type": "operator",
		"start": 303,
		"end": 304,
		"match": "="
	},
	{
		"type": "string",
		"start": 305,
		"end": 318,
		"match": "\"unterminated"
	},
	{
		"type": "property",
		"start": 319,
		"end": 323,
		"match": "next"
	},
	{
		"type": "operator",
		"start": 324,
		"end": 325,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 326,
		"end": 331,
		"match": "after"
	},
	{
		"type": "plain_scalar",
		"start": 332,
		"end": 335,
		"match": "the"
	},
	{
		"type": "plain_scalar",
		"start": 336,
		"end": 348,
		"match": "unterminated"
	},
	{
		"type": "plain_scalar",
		"start": 349,
		"end": 355,
		"match": "string"
	},
	{
		"type": "property",
		"start": 356,
		"end": 360,
		"match": "inch"
	},
	{
		"type": "operator",
		"start": 361,
		"end": 362,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 363,
		"end": 364,
		"match": "5"
	},
	{
		"type": "string",
		"start": 364,
		"end": 373,
		"match": "\" monitor"
	},
	{
		"type": "property",
		"start": 374,
		"end": 377,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 378,
		"end": 379,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 380,
		"end": 386,
		"match": "python"
	},
	{
		"type": "plain_scalar",
		"start": 387,
		"end": 389,
		"match": "-c"
	},
	{
		"type": "string",
		"start": 390,
		"end": 416,
		"match": "'import os; print(os.sep)'"
	},
	{
		"type": "property",
		"start": 417,
		"end": 421,
		"match": "path"
	},
	{
		"type": "operator",
		"start": 422,
		"end": 423,
		"match": "="
	},
	{
		"type": "string",
		"start": 424,
		"end": 427,
		"match": "\"C:"
	},
	{
		"type": "string_escape",
		"start": 427,
		"end": 429,
		"match": "\\T"
	},
	{
		"type": "string",
		"start": 429,
		"end": 432,
		"match": "emp"
	},
	{
		"type": "string_escape",
		"start": 432,
		"end": 434,
		"match": "\\\""
	},
	{
		"type": "property",
		"start": 435,
		"end": 440,
		"match": "empty"
	},
	{
		"type": "operator",
		"start": 441,
		"end": 442,
		"match": "="
	},
	{
		"type": "string",
		"start": 443,
		"end": 445,
		"match": "\"\""
	},
	{
		"type": "string",
		"start": 446,
		"end": 448,
		"match": "''"
	},
	{
		"type": "property",
		"start": 449,
		"end": 451,
		"match": "lg"
	},
	{
		"type": "operator",
		"start": 452,
		"end": 453,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 454,
		"end": 457,
		"match": "log"
	},
	{
		"type": "plain_scalar",
		"start": 458,
		"end": 477,
		"match": "--pretty=format:'%h"
	},
	{
		"type": "plain_scalar",
		"start": 478,
		"end": 481,
		"match": "%s'"
	}
];
