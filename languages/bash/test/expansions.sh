#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-
