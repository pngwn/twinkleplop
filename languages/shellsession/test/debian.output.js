export const test = [
	{
		"type": "prompt_prefix",
		"start": 0,
		"end": 23,
		"match": "(venv) dev@ubuntu:~/app"
	},
	{
		"type": "prompt",
		"start": 23,
		"end": 24,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 25,
		"end": 74,
		"match": "pip install -r requirements.txt | tee install.log"
	},
	{
		"type": "output",
		"start": 75,
		"end": 109,
		"match": "Successfully installed flask-3.0.3"
	},
	{
		"type": "prompt_prefix",
		"start": 110,
		"end": 126,
		"match": "dev@ubuntu:~/app"
	},
	{
		"type": "prompt",
		"start": 126,
		"end": 127,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 128,
		"end": 146,
		"match": "cat > .env <<'EOF'"
	},
	{
		"type": "prompt",
		"start": 147,
		"end": 148,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 149,
		"end": 182,
		"match": "DB_URL=\"postgres://localhost/$DB\""
	},
	{
		"type": "prompt",
		"start": 183,
		"end": 184,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 185,
		"end": 188,
		"match": "EOF"
	},
	{
		"type": "prompt_prefix",
		"start": 189,
		"end": 202,
		"match": "root@ubuntu:/"
	},
	{
		"type": "prompt",
		"start": 202,
		"end": 203,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 204,
		"end": 230,
		"match": "whoami # should print root"
	},
	{
		"type": "output",
		"start": 231,
		"end": 285,
		"match": "Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease"
	}
];
