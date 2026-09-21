$ echo "hello
> world"
hello
world
$ ls \
>     -la
% git commit -m "fix: handle
dquote> multi-line messages"
$ cat <<EOF
> body $HOME
>
> EOF
$ echo `date` $(( 1 + 2 )) ${HOME:-/} 'x' # c
$ for f in *.txt; do
for> echo "$f"
for> done
