export const test = [
	{
		"type": "prompt_prefix",
		"start": 0,
		"end": 15,
		"match": "[root@fedora ~]"
	},
	{
		"type": "prompt",
		"start": 15,
		"end": 16,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 17,
		"end": 33,
		"match": "dnf install -y \\"
	},
	{
		"type": "prompt",
		"start": 34,
		"end": 35,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 40,
		"end": 45,
		"match": "git \\"
	},
	{
		"type": "prompt",
		"start": 46,
		"end": 47,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 52,
		"end": 56,
		"match": "make"
	},
	{
		"type": "prompt_prefix",
		"start": 57,
		"end": 65,
		"match": "bash-5.2"
	},
	{
		"type": "prompt",
		"start": 65,
		"end": 66,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 67,
		"end": 93,
		"match": "echo ${HOME:-/} $((1 + 2))"
	},
	{
		"type": "output",
		"start": 94,
		"end": 101,
		"match": "/root 3"
	},
	{
		"type": "prompt",
		"start": 102,
		"end": 103,
		"match": "λ"
	},
	{
		"type": "raw_shell",
		"start": 104,
		"end": 112,
		"match": "ls -la ~"
	},
	{
		"type": "prompt",
		"start": 113,
		"end": 114,
		"match": "❯"
	},
	{
		"type": "raw_shell",
		"start": 115,
		"end": 133,
		"match": "git status --short"
	}
];
