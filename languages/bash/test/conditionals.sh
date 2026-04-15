#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]
