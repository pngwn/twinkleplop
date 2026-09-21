export const test = [
	{
		"type": "prompt",
		"start": 0,
		"end": 1,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 2,
		"end": 13,
		"match": "echo \"hello"
	},
	{
		"type": "prompt",
		"start": 14,
		"end": 15,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 16,
		"end": 22,
		"match": "world\""
	},
	{
		"type": "output",
		"start": 23,
		"end": 28,
		"match": "hello"
	},
	{
		"type": "output",
		"start": 29,
		"end": 34,
		"match": "world"
	},
	{
		"type": "prompt",
		"start": 35,
		"end": 36,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 37,
		"end": 41,
		"match": "ls \\"
	},
	{
		"type": "prompt",
		"start": 42,
		"end": 43,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 48,
		"end": 51,
		"match": "-la"
	},
	{
		"type": "prompt",
		"start": 52,
		"end": 53,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 54,
		"end": 80,
		"match": "git commit -m \"fix: handle"
	},
	{
		"type": "prompt_prefix",
		"start": 81,
		"end": 87,
		"match": "dquote"
	},
	{
		"type": "prompt",
		"start": 87,
		"end": 88,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 89,
		"end": 109,
		"match": "multi-line messages\""
	},
	{
		"type": "prompt",
		"start": 110,
		"end": 111,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 112,
		"end": 121,
		"match": "cat <<EOF"
	},
	{
		"type": "prompt",
		"start": 122,
		"end": 123,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 124,
		"end": 134,
		"match": "body $HOME"
	},
	{
		"type": "prompt",
		"start": 135,
		"end": 136,
		"match": ">"
	},
	{
		"type": "prompt",
		"start": 137,
		"end": 138,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 139,
		"end": 142,
		"match": "EOF"
	},
	{
		"type": "prompt",
		"start": 143,
		"end": 144,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 145,
		"end": 188,
		"match": "echo `date` $(( 1 + 2 )) ${HOME:-/} 'x' # c"
	},
	{
		"type": "prompt",
		"start": 189,
		"end": 190,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 191,
		"end": 209,
		"match": "for f in *.txt; do"
	},
	{
		"type": "prompt_prefix",
		"start": 210,
		"end": 213,
		"match": "for"
	},
	{
		"type": "prompt",
		"start": 213,
		"end": 214,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 215,
		"end": 224,
		"match": "echo \"$f\""
	},
	{
		"type": "prompt_prefix",
		"start": 225,
		"end": 228,
		"match": "for"
	},
	{
		"type": "prompt",
		"start": 228,
		"end": 229,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 230,
		"end": 234,
		"match": "done"
	}
];
