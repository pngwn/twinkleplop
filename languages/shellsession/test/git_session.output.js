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
		"end": 14,
		"match": "echo $EDITOR"
	},
	{
		"type": "output",
		"start": 15,
		"end": 19,
		"match": "nvim"
	},
	{
		"type": "prompt",
		"start": 20,
		"end": 21,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 22,
		"end": 37,
		"match": "git switch main"
	},
	{
		"type": "output",
		"start": 38,
		"end": 63,
		"match": "Switched to branch 'main'"
	},
	{
		"type": "output",
		"start": 64,
		"end": 109,
		"match": "Your branch is up to date with 'origin/main'."
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
		"end": 129,
		"match": "git pull --rebase"
	},
	{
		"type": "output",
		"start": 130,
		"end": 149,
		"match": "Already up to date."
	},
	{
		"type": "prompt",
		"start": 150,
		"end": 151,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 152,
		"end": 168,
		"match": "echo 'first line"
	},
	{
		"type": "prompt",
		"start": 169,
		"end": 170,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 171,
		"end": 183,
		"match": "second line'"
	},
	{
		"type": "output",
		"start": 184,
		"end": 194,
		"match": "first line"
	},
	{
		"type": "output",
		"start": 195,
		"end": 206,
		"match": "second line"
	},
	{
		"type": "prompt",
		"start": 208,
		"end": 209,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 210,
		"end": 270,
		"match": "note: a comment pasted into a session reads as a root prompt"
	}
];
