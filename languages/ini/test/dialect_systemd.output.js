export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 31,
		"match": "#  SPDX-License-Identifier: MIT"
	},
	{
		"type": "punctuation",
		"start": 32,
		"end": 33,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 33,
		"end": 37,
		"match": "Unit"
	},
	{
		"type": "punctuation",
		"start": 37,
		"end": 38,
		"match": "]"
	},
	{
		"type": "property",
		"start": 39,
		"end": 50,
		"match": "Description"
	},
	{
		"type": "operator",
		"start": 50,
		"end": 51,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 51,
		"end": 58,
		"match": "Example"
	},
	{
		"type": "plain_scalar",
		"start": 59,
		"end": 65,
		"match": "daemon"
	},
	{
		"type": "plain_scalar",
		"start": 66,
		"end": 68,
		"match": "on"
	},
	{
		"type": "plain_scalar",
		"start": 69,
		"end": 71,
		"match": "%I"
	},
	{
		"type": "property",
		"start": 72,
		"end": 85,
		"match": "Documentation"
	},
	{
		"type": "operator",
		"start": 85,
		"end": 86,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 86,
		"end": 100,
		"match": "man:example(8)"
	},
	{
		"type": "plain_scalar",
		"start": 101,
		"end": 125,
		"match": "https://example.com/docs"
	},
	{
		"type": "property",
		"start": 126,
		"end": 131,
		"match": "After"
	},
	{
		"type": "operator",
		"start": 131,
		"end": 132,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 132,
		"end": 153,
		"match": "network-online.target"
	},
	{
		"type": "property",
		"start": 154,
		"end": 159,
		"match": "Wants"
	},
	{
		"type": "operator",
		"start": 159,
		"end": 160,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 160,
		"end": 181,
		"match": "network-online.target"
	},
	{
		"type": "comment",
		"start": 183,
		"end": 237,
		"match": "# comment lines between settings, don't break anything"
	},
	{
		"type": "property",
		"start": 238,
		"end": 257,
		"match": "ConditionPathExists"
	},
	{
		"type": "operator",
		"start": 257,
		"end": 258,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 258,
		"end": 267,
		"match": "/dev/tty0"
	},
	{
		"type": "punctuation",
		"start": 269,
		"end": 270,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 270,
		"end": 277,
		"match": "Service"
	},
	{
		"type": "punctuation",
		"start": 277,
		"end": 278,
		"match": "]"
	},
	{
		"type": "property",
		"start": 279,
		"end": 283,
		"match": "Type"
	},
	{
		"type": "operator",
		"start": 283,
		"end": 284,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 284,
		"end": 290,
		"match": "notify"
	},
	{
		"type": "property",
		"start": 291,
		"end": 300,
		"match": "ExecStart"
	},
	{
		"type": "operator",
		"start": 300,
		"end": 301,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 301,
		"end": 318,
		"match": "-/usr/bin/example"
	},
	{
		"type": "plain_scalar",
		"start": 319,
		"end": 327,
		"match": "--config"
	},
	{
		"type": "plain_scalar",
		"start": 328,
		"end": 348,
		"match": "/etc/example/%i.conf"
	},
	{
		"type": "punctuation",
		"start": 349,
		"end": 350,
		"match": "\\"
	},
	{
		"type": "plain_scalar",
		"start": 361,
		"end": 370,
		"match": "--verbose"
	},
	{
		"type": "property",
		"start": 371,
		"end": 381,
		"match": "ExecReload"
	},
	{
		"type": "operator",
		"start": 381,
		"end": 382,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 382,
		"end": 391,
		"match": "/bin/kill"
	},
	{
		"type": "plain_scalar",
		"start": 392,
		"end": 396,
		"match": "-HUP"
	},
	{
		"type": "plain_scalar",
		"start": 397,
		"end": 405,
		"match": "$MAINPID"
	},
	{
		"type": "property",
		"start": 406,
		"end": 417,
		"match": "Environment"
	},
	{
		"type": "operator",
		"start": 417,
		"end": 418,
		"match": "="
	},
	{
		"type": "string",
		"start": 418,
		"end": 432,
		"match": "\"LANG=C.UTF-8\""
	},
	{
		"type": "string",
		"start": 433,
		"end": 444,
		"match": "\"EXTRA=a b\""
	},
	{
		"type": "property",
		"start": 445,
		"end": 452,
		"match": "Restart"
	},
	{
		"type": "operator",
		"start": 452,
		"end": 453,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 453,
		"end": 463,
		"match": "on-failure"
	},
	{
		"type": "property",
		"start": 464,
		"end": 474,
		"match": "RestartSec"
	},
	{
		"type": "operator",
		"start": 474,
		"end": 475,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 475,
		"end": 477,
		"match": "5s"
	},
	{
		"type": "punctuation",
		"start": 479,
		"end": 480,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 480,
		"end": 487,
		"match": "Install"
	},
	{
		"type": "punctuation",
		"start": 487,
		"end": 488,
		"match": "]"
	},
	{
		"type": "property",
		"start": 489,
		"end": 497,
		"match": "WantedBy"
	},
	{
		"type": "operator",
		"start": 497,
		"end": 498,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 498,
		"end": 515,
		"match": "multi-user.target"
	}
];
