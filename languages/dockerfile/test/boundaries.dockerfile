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
