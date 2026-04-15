#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"
