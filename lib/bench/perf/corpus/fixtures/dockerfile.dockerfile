# ---- boundaries.dockerfile ----
FROM alpine:AS AS build
RUNNING is not an instruction
RUN-script is not an instruction
COPY.foo is not an instruction
xRUN is not an instruction
RUN echo FROM CMD AS NONE HEALTHCHECK
HEALTHCHECK NONE-more
FROM alpine AS-more
RUN echo \
  FROM is a continued argument
ENV FROM=literal AS=literal RUNNING=value
RUN echo "unfinished
FROM alpine
COPY ["unfinished
FROM busybox
ENV BROKEN=${X:-${Y
FROM scratch


# ---- continuations.dockerfile ----
# build dependencies \
FROM alpine
RUN echo hello \
  # package cache

  world && \
  echo goodbye
HEALTHCHECK --interval=5m --timeout=3s \
  CMD curl -f http://localhost/ || exit 1
ONBUILD \
  COPY --from=build \
  /out /app
ENV MESSAGE="hello \
  # message
  world" OTHER='one \
  two'
RUN ["echo", \
  # default command
  "$HOME"]
FROM alpine AS \
  production
COPY file /file


# ---- heredoc-limitations.dockerfile ----
FROM alpine
ARG NAME=world
COPY <<EOF /greeting
hello ${NAME}
EOF
COPY <<-'LITERAL' /script.sh
	echo "$NAME"
	LITERAL
RUN <<FIRST cat > /one && <<SECOND cat > /two
first
FIRST
second
SECOND
RUN <<-"SCRIPT" sh
	printf '%s\n' "hello"
	SCRIPT
CMD ["sh"]


# ---- instructions.dockerfile ----
# syntax=docker/dockerfile:1
# check=skip=JSONArgsRecommended;error=true
ARG BASE=alpine:3.22
FrOm --platform=$BUILDPLATFORM ${BASE} aS build
LABEL org.opencontainers.image.title="Twinkleplop" \
      org.opencontainers.image.description='Unicode: café 日本語'
ENV NODE_ENV=production PORT=8080 PATH="/app/bin:${PATH}"
ENV LEGACY value with spaces
ARG TARGETARCH
WORKDIR /app
COPY --link --from=build --chown=1000:1000 --chmod=0755 /out /app
ADD --checksum=sha256:abc123 https://example.com/archive.tar.gz#release /src/
RUN --mount=type=cache,target=/root/.cache --network=none build --release
USER 1000:1000
EXPOSE 8080/tcp 8000-8010/udp
VOLUME ["/data", "/cache"]
STOPSIGNAL SIGTERM
STOPSIGNAL 15
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost/ || exit 1
ONBUILD COPY . /app
ONBUILD RUN echo ready
HEALTHCHECK NONE
MAINTAINER Someone <someone@example.com>
SHELL ["/bin/sh", "-c"]
ENTRYPOINT ["/app/server"]
CMD ["--help"]


# ---- strings.dockerfile ----
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


# ---- windows.dockerfile ----
# syntax=docker/dockerfile:1
# EsCaPe = `

FROM mcr.microsoft.com/windows/nanoserver:ltsc2022
COPY file.txt C:\
RUN echo hello `
  # build output
  && echo world
SHELL ["powershell", "-command"]
RUN ["cmd", "/C", "C:\\Windows\\System32\\cmd.exe", "a\"b"]
ENV DEST="C:\cache" QUOTED="a`"quote`"" VALUE=$DEST
# escape=\
RUN echo still `
  continued
WORKDIR C:\app
