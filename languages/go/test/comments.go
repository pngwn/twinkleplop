// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}
