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
