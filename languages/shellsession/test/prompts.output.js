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
		"end": 4,
		"match": "ls"
	},
	{
		"type": "prompt",
		"start": 5,
		"end": 6,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 7,
		"end": 13,
		"match": "tabbed"
	},
	{
		"type": "prompt",
		"start": 14,
		"end": 15,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 16,
		"end": 20,
		"match": "$ ls"
	},
	{
		"type": "prompt",
		"start": 21,
		"end": 22,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 23,
		"end": 46,
		"match": "apt-get install -y curl"
	},
	{
		"type": "prompt",
		"start": 47,
		"end": 48,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 49,
		"end": 53,
		"match": "make"
	},
	{
		"type": "prompt",
		"start": 54,
		"end": 55,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 56,
		"end": 65,
		"match": "continued"
	},
	{
		"type": "prompt",
		"start": 66,
		"end": 67,
		"match": "$"
	},
	{
		"type": "prompt_prefix",
		"start": 68,
		"end": 79,
		"match": "user@host:~"
	},
	{
		"type": "prompt",
		"start": 79,
		"end": 80,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 81,
		"end": 95,
		"match": "cat > file.txt"
	},
	{
		"type": "prompt_prefix",
		"start": 96,
		"end": 107,
		"match": "user@host:~"
	},
	{
		"type": "prompt",
		"start": 107,
		"end": 108,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 109,
		"end": 119,
		"match": "echo $ foo"
	},
	{
		"type": "prompt_prefix",
		"start": 120,
		"end": 131,
		"match": "root@host:~"
	},
	{
		"type": "prompt",
		"start": 131,
		"end": 132,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 133,
		"end": 154,
		"match": "ls # trailing comment"
	},
	{
		"type": "prompt_prefix",
		"start": 155,
		"end": 159,
		"match": "ab@c"
	},
	{
		"type": "prompt",
		"start": 159,
		"end": 160,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 161,
		"end": 163,
		"match": "ls"
	},
	{
		"type": "prompt_prefix",
		"start": 164,
		"end": 179,
		"match": "user@host:~/src"
	},
	{
		"type": "prompt",
		"start": 179,
		"end": 180,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 181,
		"end": 187,
		"match": "ls -la"
	},
	{
		"type": "prompt_prefix",
		"start": 188,
		"end": 207,
		"match": "user@MacBook-Pro ~ "
	},
	{
		"type": "prompt",
		"start": 207,
		"end": 208,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 209,
		"end": 215,
		"match": "ls -la"
	},
	{
		"type": "prompt_prefix",
		"start": 216,
		"end": 237,
		"match": "pngwn@mbp ~/Projects "
	},
	{
		"type": "prompt",
		"start": 237,
		"end": 238,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 239,
		"end": 248,
		"match": "pnpm test"
	},
	{
		"type": "prompt_prefix",
		"start": 249,
		"end": 260,
		"match": "user@host ~"
	},
	{
		"type": "prompt",
		"start": 260,
		"end": 261,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 262,
		"end": 264,
		"match": "ls"
	},
	{
		"type": "prompt_prefix",
		"start": 265,
		"end": 280,
		"match": "user@host:~/a b"
	},
	{
		"type": "prompt",
		"start": 280,
		"end": 281,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 282,
		"end": 284,
		"match": "ls"
	},
	{
		"type": "prompt_prefix",
		"start": 285,
		"end": 300,
		"match": "[user@host dir]"
	},
	{
		"type": "prompt",
		"start": 300,
		"end": 301,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 302,
		"end": 307,
		"match": "cd .."
	},
	{
		"type": "prompt_prefix",
		"start": 308,
		"end": 323,
		"match": "[root@fedora ~]"
	},
	{
		"type": "prompt",
		"start": 323,
		"end": 324,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 325,
		"end": 331,
		"match": "whoami"
	},
	{
		"type": "prompt_prefix",
		"start": 332,
		"end": 343,
		"match": "[10:32:01] "
	},
	{
		"type": "prompt",
		"start": 343,
		"end": 344,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 345,
		"end": 349,
		"match": "date"
	},
	{
		"type": "prompt_prefix",
		"start": 350,
		"end": 368,
		"match": "(venv) user@host:~"
	},
	{
		"type": "prompt",
		"start": 368,
		"end": 369,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 370,
		"end": 401,
		"match": "pip install -r requirements.txt"
	},
	{
		"type": "prompt_prefix",
		"start": 402,
		"end": 409,
		"match": "(venv) "
	},
	{
		"type": "prompt",
		"start": 409,
		"end": 410,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 411,
		"end": 417,
		"match": "python"
	},
	{
		"type": "prompt_prefix",
		"start": 418,
		"end": 436,
		"match": "(base) user@host:~"
	},
	{
		"type": "prompt",
		"start": 436,
		"end": 437,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 438,
		"end": 448,
		"match": "conda list"
	},
	{
		"type": "prompt_prefix",
		"start": 449,
		"end": 455,
		"match": "(venv)"
	},
	{
		"type": "prompt",
		"start": 455,
		"end": 456,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 457,
		"end": 462,
		"match": "glued"
	},
	{
		"type": "prompt_prefix",
		"start": 463,
		"end": 469,
		"match": "sh-3.2"
	},
	{
		"type": "prompt",
		"start": 469,
		"end": 470,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 471,
		"end": 478,
		"match": "echo hi"
	},
	{
		"type": "prompt_prefix",
		"start": 479,
		"end": 487,
		"match": "bash-5.2"
	},
	{
		"type": "prompt",
		"start": 487,
		"end": 488,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 489,
		"end": 496,
		"match": "echo hi"
	},
	{
		"type": "prompt_prefix",
		"start": 497,
		"end": 500,
		"match": "zsh"
	},
	{
		"type": "prompt",
		"start": 500,
		"end": 501,
		"match": "%"
	},
	{
		"type": "raw_shell",
		"start": 502,
		"end": 509,
		"match": "echo hi"
	},
	{
		"type": "prompt_prefix",
		"start": 510,
		"end": 519,
		"match": "bash-5.2 "
	},
	{
		"type": "prompt",
		"start": 519,
		"end": 520,
		"match": "$"
	},
	{
		"type": "raw_shell",
		"start": 521,
		"end": 527,
		"match": "spaced"
	},
	{
		"type": "prompt_prefix",
		"start": 528,
		"end": 534,
		"match": "dquote"
	},
	{
		"type": "prompt",
		"start": 534,
		"end": 535,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 536,
		"end": 547,
		"match": "multi-line\""
	},
	{
		"type": "prompt_prefix",
		"start": 548,
		"end": 552,
		"match": "for "
	},
	{
		"type": "prompt_prefix",
		"start": 552,
		"end": 558,
		"match": "dquote"
	},
	{
		"type": "prompt",
		"start": 558,
		"end": 559,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 560,
		"end": 566,
		"match": "nested"
	},
	{
		"type": "prompt_prefix",
		"start": 567,
		"end": 574,
		"match": "heredoc"
	},
	{
		"type": "prompt",
		"start": 574,
		"end": 575,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 576,
		"end": 580,
		"match": "body"
	},
	{
		"type": "prompt_prefix",
		"start": 581,
		"end": 596,
		"match": "irb(main):001:0"
	},
	{
		"type": "prompt",
		"start": 596,
		"end": 597,
		"match": ">"
	},
	{
		"type": "raw_shell",
		"start": 598,
		"end": 604,
		"match": "puts 1"
	},
	{
		"type": "prompt_prefix",
		"start": 605,
		"end": 621,
		"match": "http://foo:8080 "
	},
	{
		"type": "prompt",
		"start": 621,
		"end": 622,
		"match": "#"
	},
	{
		"type": "raw_shell",
		"start": 623,
		"end": 626,
		"match": "bar"
	},
	{
		"type": "prompt_prefix",
		"start": 627,
		"end": 638,
		"match": "user@host:~"
	},
	{
		"type": "prompt",
		"start": 638,
		"end": 639,
		"match": "$"
	}
];
