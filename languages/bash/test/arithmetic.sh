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
