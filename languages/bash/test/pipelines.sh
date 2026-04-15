#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3
