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
