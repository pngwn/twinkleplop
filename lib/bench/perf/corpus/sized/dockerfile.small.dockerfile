# ---- unit 1 ----
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
