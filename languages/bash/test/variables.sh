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
