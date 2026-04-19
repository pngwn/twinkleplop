export const test = [
	{
		"type": "code_fence",
		"start": 0,
		"end": 3,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 3,
		"end": 5,
		"match": "js"
	},
	{
		"type": "raw_code_block",
		"start": 5,
		"end": 19,
		"match": "\nconst x = 1;\n"
	},
	{
		"type": "code_fence",
		"start": 19,
		"end": 23,
		"match": "```\n"
	},
	{
		"type": "code_fence",
		"start": 24,
		"end": 27,
		"match": "```"
	},
	{
		"type": "raw_code_block",
		"start": 27,
		"end": 40,
		"match": "\nno language\n"
	},
	{
		"type": "code_fence",
		"start": 40,
		"end": 44,
		"match": "```\n"
	},
	{
		"type": "code_fence",
		"start": 45,
		"end": 48,
		"match": "~~~"
	},
	{
		"type": "code_language",
		"start": 48,
		"end": 54,
		"match": "python"
	},
	{
		"type": "raw_code_block",
		"start": 54,
		"end": 76,
		"match": "\nprint(\"tilde fence\")\n"
	},
	{
		"type": "code_fence",
		"start": 76,
		"end": 80,
		"match": "~~~\n"
	}
];
