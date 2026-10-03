export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 19,
		"match": "#!/usr/bin/env pwsh"
	},
	{
		"type": "comment",
		"start": 20,
		"end": 42,
		"match": "#Requires -Version 7.0"
	},
	{
		"type": "comment",
		"start": 43,
		"end": 160,
		"match": "<#\n.SYNOPSIS\nA report with comments containing \"quotes\", $variables and parentheses ).\n<# This opener does not nest.\n"
	},
	{
		"type": "comment",
		"start": 160,
		"end": 162,
		"match": "#>"
	},
	{
		"type": "variable",
		"start": 163,
		"end": 169,
		"match": "$after"
	},
	{
		"type": "operator",
		"start": 170,
		"end": 171,
		"match": "="
	},
	{
		"type": "number",
		"start": 172,
		"end": 173,
		"match": "1"
	},
	{
		"type": "comment",
		"start": 174,
		"end": 188,
		"match": "# line comment"
	},
	{
		"type": "identifier",
		"start": 189,
		"end": 201,
		"match": "Write-Output"
	},
	{
		"type": "identifier",
		"start": 202,
		"end": 213,
		"match": "hello#world"
	},
	{
		"type": "identifier",
		"start": 214,
		"end": 226,
		"match": "hello`#world"
	},
	{
		"type": "comment",
		"start": 227,
		"end": 243,
		"match": "# a real comment"
	},
	{
		"type": "string",
		"start": 244,
		"end": 245,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 245,
		"end": 247,
		"match": "$("
	},
	{
		"type": "comment",
		"start": 247,
		"end": 287,
		"match": "<# a ) does not close the subexpression "
	},
	{
		"type": "comment",
		"start": 287,
		"end": 289,
		"match": "#>"
	},
	{
		"type": "punctuation",
		"start": 290,
		"end": 291,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 291,
		"end": 299,
		"match": "Get-Date"
	},
	{
		"type": "punctuation",
		"start": 299,
		"end": 301,
		"match": "))"
	},
	{
		"type": "string",
		"start": 301,
		"end": 302,
		"match": "\""
	},
	{
		"type": "comment",
		"start": 303,
		"end": 332,
		"match": "# SIG # Begin signature block"
	},
	{
		"type": "comment",
		"start": 333,
		"end": 339,
		"match": "# ABCD"
	},
	{
		"type": "comment",
		"start": 340,
		"end": 367,
		"match": "# SIG # End signature block"
	}
];
