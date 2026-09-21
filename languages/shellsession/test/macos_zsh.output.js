export const test = [
	{
		"type": "prompt_prefix",
		"start": 0,
		"end": 21,
		"match": "pngwn@mbp ~/Projects "
	},
	{
		"type": "prompt",
		"start": 21,
		"end": 22,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 23,
		"end": 49,
		"match": "git commit -m \"fix: handle"
	},
	{
		"type": "prompt_prefix",
		"start": 50,
		"end": 56,
		"match": "dquote"
	},
	{
		"type": "prompt",
		"start": 56,
		"end": 57,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 58,
		"end": 78,
		"match": "multi-line messages\""
	},
	{
		"type": "output",
		"start": 79,
		"end": 125,
		"match": "[main 3f2a1c9] fix: handle multi-line messages"
	},
	{
		"type": "output",
		"start": 126,
		"end": 158,
		"match": " 1 file changed, 2 insertions(+)"
	},
	{
		"type": "prompt_prefix",
		"start": 159,
		"end": 180,
		"match": "pngwn@mbp ~/Projects "
	},
	{
		"type": "prompt",
		"start": 180,
		"end": 181,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 182,
		"end": 228,
		"match": "curl -fsSL https://example.com/install.sh | sh"
	},
	{
		"type": "output",
		"start": 229,
		"end": 308,
		"match": "######################################################################## 100.0%"
	},
	{
		"type": "output",
		"start": 309,
		"end": 322,
		"match": "🍺  installed"
	}
];
