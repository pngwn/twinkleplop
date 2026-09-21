export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 26,
		"match": "# global git configuration"
	},
	{
		"type": "punctuation",
		"start": 27,
		"end": 28,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 28,
		"end": 32,
		"match": "user"
	},
	{
		"type": "punctuation",
		"start": 32,
		"end": 33,
		"match": "]"
	},
	{
		"type": "property",
		"start": 35,
		"end": 39,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 40,
		"end": 41,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 42,
		"end": 49,
		"match": "Example"
	},
	{
		"type": "plain_scalar",
		"start": 50,
		"end": 56,
		"match": "Person"
	},
	{
		"type": "property",
		"start": 58,
		"end": 63,
		"match": "email"
	},
	{
		"type": "operator",
		"start": 64,
		"end": 65,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 66,
		"end": 84,
		"match": "person@example.com"
	},
	{
		"type": "punctuation",
		"start": 85,
		"end": 86,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 86,
		"end": 91,
		"match": "alias"
	},
	{
		"type": "punctuation",
		"start": 91,
		"end": 92,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 94,
		"end": 108,
		"match": "# short status"
	},
	{
		"type": "property",
		"start": 110,
		"end": 111,
		"match": "s"
	},
	{
		"type": "operator",
		"start": 112,
		"end": 113,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 114,
		"end": 120,
		"match": "status"
	},
	{
		"type": "plain_scalar",
		"start": 121,
		"end": 123,
		"match": "-s"
	},
	{
		"type": "property",
		"start": 125,
		"end": 126,
		"match": "l"
	},
	{
		"type": "operator",
		"start": 127,
		"end": 128,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 129,
		"end": 132,
		"match": "log"
	},
	{
		"type": "plain_scalar",
		"start": 133,
		"end": 149,
		"match": "--pretty=oneline"
	},
	{
		"type": "plain_scalar",
		"start": 150,
		"end": 152,
		"match": "-n"
	},
	{
		"type": "plain_scalar",
		"start": 153,
		"end": 155,
		"match": "20"
	},
	{
		"type": "plain_scalar",
		"start": 156,
		"end": 163,
		"match": "--graph"
	},
	{
		"type": "plain_scalar",
		"start": 164,
		"end": 179,
		"match": "--abbrev-commit"
	},
	{
		"type": "property",
		"start": 181,
		"end": 182,
		"match": "d"
	},
	{
		"type": "operator",
		"start": 183,
		"end": 184,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 185,
		"end": 186,
		"match": "!"
	},
	{
		"type": "string",
		"start": 186,
		"end": 248,
		"match": "\"git diff-index --quiet HEAD -- || clear; git --no-pager diff\""
	},
	{
		"type": "property",
		"start": 250,
		"end": 252,
		"match": "ca"
	},
	{
		"type": "operator",
		"start": 253,
		"end": 254,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 255,
		"end": 259,
		"match": "!git"
	},
	{
		"type": "plain_scalar",
		"start": 260,
		"end": 263,
		"match": "add"
	},
	{
		"type": "string",
		"start": 264,
		"end": 307,
		"match": "':(exclude,attr:builtin_objectmode=160000)'"
	},
	{
		"type": "plain_scalar",
		"start": 308,
		"end": 310,
		"match": "&&"
	},
	{
		"type": "plain_scalar",
		"start": 311,
		"end": 314,
		"match": "git"
	},
	{
		"type": "plain_scalar",
		"start": 315,
		"end": 321,
		"match": "commit"
	},
	{
		"type": "plain_scalar",
		"start": 322,
		"end": 325,
		"match": "-av"
	},
	{
		"type": "property",
		"start": 327,
		"end": 329,
		"match": "go"
	},
	{
		"type": "operator",
		"start": 330,
		"end": 331,
		"match": "="
	},
	{
		"type": "string",
		"start": 332,
		"end": 356,
		"match": "\"!f() { git checkout -b "
	},
	{
		"type": "string_escape",
		"start": 356,
		"end": 358,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 358,
		"end": 360,
		"match": "$1"
	},
	{
		"type": "string_escape",
		"start": 360,
		"end": 362,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 362,
		"end": 392,
		"match": " 2> /dev/null || git checkout "
	},
	{
		"type": "string_escape",
		"start": 392,
		"end": 394,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 394,
		"end": 396,
		"match": "$1"
	},
	{
		"type": "string_escape",
		"start": 396,
		"end": 398,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 398,
		"end": 405,
		"match": "; }; f\""
	},
	{
		"type": "punctuation",
		"start": 406,
		"end": 407,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 407,
		"end": 413,
		"match": "color "
	},
	{
		"type": "string",
		"start": 413,
		"end": 419,
		"match": "\"diff\""
	},
	{
		"type": "punctuation",
		"start": 419,
		"end": 420,
		"match": "]"
	},
	{
		"type": "property",
		"start": 422,
		"end": 426,
		"match": "meta"
	},
	{
		"type": "operator",
		"start": 427,
		"end": 428,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 429,
		"end": 435,
		"match": "yellow"
	},
	{
		"type": "plain_scalar",
		"start": 436,
		"end": 440,
		"match": "bold"
	},
	{
		"type": "property",
		"start": 442,
		"end": 446,
		"match": "frag"
	},
	{
		"type": "operator",
		"start": 447,
		"end": 448,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 449,
		"end": 456,
		"match": "magenta"
	},
	{
		"type": "plain_scalar",
		"start": 457,
		"end": 461,
		"match": "bold"
	},
	{
		"type": "comment",
		"start": 462,
		"end": 473,
		"match": "# line info"
	},
	{
		"type": "property",
		"start": 475,
		"end": 478,
		"match": "old"
	},
	{
		"type": "operator",
		"start": 479,
		"end": 480,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 481,
		"end": 484,
		"match": "red"
	},
	{
		"type": "comment",
		"start": 485,
		"end": 496,
		"match": "; deletions"
	},
	{
		"type": "punctuation",
		"start": 497,
		"end": 498,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 498,
		"end": 502,
		"match": "url "
	},
	{
		"type": "string",
		"start": 502,
		"end": 519,
		"match": "\"git@github.com:\""
	},
	{
		"type": "punctuation",
		"start": 519,
		"end": 520,
		"match": "]"
	},
	{
		"type": "property",
		"start": 522,
		"end": 531,
		"match": "insteadOf"
	},
	{
		"type": "operator",
		"start": 532,
		"end": 533,
		"match": "="
	},
	{
		"type": "string",
		"start": 534,
		"end": 539,
		"match": "\"gh:\""
	},
	{
		"type": "punctuation",
		"start": 540,
		"end": 541,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 541,
		"end": 551,
		"match": "includeIf "
	},
	{
		"type": "string",
		"start": 551,
		"end": 567,
		"match": "\"gitdir:~/work/\""
	},
	{
		"type": "punctuation",
		"start": 567,
		"end": 568,
		"match": "]"
	},
	{
		"type": "property",
		"start": 570,
		"end": 574,
		"match": "path"
	},
	{
		"type": "operator",
		"start": 575,
		"end": 576,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 577,
		"end": 594,
		"match": "~/.gitconfig-work"
	},
	{
		"type": "punctuation",
		"start": 595,
		"end": 596,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 596,
		"end": 600,
		"match": "core"
	},
	{
		"type": "punctuation",
		"start": 600,
		"end": 601,
		"match": "]"
	},
	{
		"type": "property",
		"start": 603,
		"end": 615,
		"match": "excludesfile"
	},
	{
		"type": "operator",
		"start": 616,
		"end": 617,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 618,
		"end": 630,
		"match": "~/.gitignore"
	},
	{
		"type": "property",
		"start": 632,
		"end": 642,
		"match": "whitespace"
	},
	{
		"type": "operator",
		"start": 643,
		"end": 644,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 645,
		"end": 697,
		"match": "space-before-tab,-indent-with-non-tab,trailing-space"
	},
	{
		"type": "property",
		"start": 699,
		"end": 703,
		"match": "bare"
	}
];
