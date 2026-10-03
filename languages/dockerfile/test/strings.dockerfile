FROM alpine:3.22
ENV ROOT=/srv CACHE="${ROOT:-${HOME:-/tmp}}/cache" RAW='$HOME ${PATH}'
ENV LITERAL=\$HOME SPACED=some\ path QUOTE="an escaped \"quote\""
LABEL quoted="a # inside a string" version=1.0 enabled=true unset=null
COPY ["$ROOT/file", "${DEST:-/data}"]
RUN ["echo", "$HOME", "${PATH}", "a\\b", "a\"b", "\u263a", "line\nend"]
RUN echo "$HOME" && echo 'literal $HOME' || echo escaped\ space
RUN echo [ bracket ] and inline#hash # Docker keeps this argument
COPY source#fragment /destination
RUN echo "$? $$ $1 $@" > /tmp/status
LABEL "name with spaces"="value" 'other key'='literal'
ENV NESTED=${VALUE:-"a}b"} EMPTY=${VALUE:+${OTHER}}
