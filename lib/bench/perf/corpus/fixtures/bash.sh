# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
#!/usr/bin/env bash
# real-world example combining many features

set -euo pipefail

readonly LOGFILE="${LOGFILE:-/tmp/app.log}"
readonly COUNT=${1:-10}

log_error() {
    local msg="$1"
    printf '%s ERROR: %s\n' "$(date +%Y-%m-%dT%H:%M:%S)" "$msg" >&2
}

process_file() {
    local file="$1"
    if [[ ! -r "$file" ]]; then
        log_error "cannot read: $file"
        return 1
    fi
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        echo "processing: $line"
    done < "$file"
}

main() {
    local -i failures=0
    for f in "$@"; do
        if ! process_file "$f"; then
            failures=$((failures + 1))
        fi
    done
    if (( failures > 0 )); then
        printf '%d failures\n' "$failures" >&2
        exit 1
    fi
}

main "$@"


# ---- conditionals.sh ----
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


# ---- expansions.sh ----
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


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
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


# ---- redirections.sh ----
#!/bin/bash
# redirection operators

# basic
cmd < input.txt
cmd > output.txt
cmd >> output.txt
cmd <> rw.txt
cmd >| force.txt

# fd-prefixed
cmd 2> errors.log
cmd 2>&1
cmd >&2
cmd <&0

# combined
cmd &> all.log
cmd &>> all.log

# here-string
cat <<< "hello"

# heredoc
cat <<EOF
literal text
EOF

# heredoc tab-strip
cat <<-END
	stripped
	END

# heredoc quoted delimiter: no expansion (limitation documented)
cat <<'DONE'
no $interpolation
DONE

# close fd
exec 3>&-


# ---- strings.sh ----
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


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}
