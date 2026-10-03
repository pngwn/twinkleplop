# syntax=docker/dockerfile:1.7
# Build image for the acme ledger service: a Go API, a small Node admin UI,
# and a distroless runtime. Built in CI with BuildKit cache mounts enabled.

ARG GO_VERSION=1.23
ARG NODE_VERSION=20.17
ARG ALPINE_VERSION=3.20
ARG DISTROLESS_TAG=nonroot

############################
# Shared base with build tools
############################
FROM golang:${GO_VERSION}-alpine${ALPINE_VERSION} AS go-base

ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0 \
    GOOS=${TARGETOS:-linux} \
    GOARCH=${TARGETARCH:-amd64} \
    GOFLAGS="-mod=readonly -trimpath" \
    GOCACHE=/root/.cache/go-build \
    GOMODCACHE=/go/pkg/mod

RUN apk add --no-cache \
      ca-certificates \
      git \
      make \
      tzdata \
    && update-ca-certificates \
    && addgroup -S -g 10001 ledger \
    && adduser -S -D -H -u 10001 -G ledger ledger

WORKDIR /src

############################
# Dependency download (cached separately from sources)
############################
FROM go-base AS go-deps

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download -x \
    && go mod verify

############################
# Lint and unit tests
############################
FROM go-deps AS go-test

ARG GOLANGCI_VERSION=v1.60.3
RUN --mount=type=cache,target=/go/pkg/mod \
    wget -qO- "https://install.acme.dev/golangci-lint/${GOLANGCI_VERSION}/install.sh" \
      | sh -s -- -b /usr/local/bin "${GOLANGCI_VERSION}"

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/root/.cache/golangci-lint \
    golangci-lint run --timeout=5m ./... \
    && go test -count=1 -race=false -shuffle=on ./... 2>&1 | tee /tmp/test.log \
    && grep -q '^ok' /tmp/test.log

############################
# Compile the API binary
############################
FROM go-deps AS go-build

ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_DATE
ENV LDFLAGS="-s -w \
  -X acme.dev/ledger/internal/build.Version=${VERSION} \
  -X acme.dev/ledger/internal/build.Commit=${COMMIT} \
  -X acme.dev/ledger/internal/build.Date=${BUILD_DATE:-1970-01-01T00:00:00Z}"

COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY migrations/ ./migrations/

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    mkdir -p /out \
    && go build -ldflags "${LDFLAGS}" -o /out/ledger ./cmd/ledger \
    && go build -ldflags "${LDFLAGS}" -o /out/ledger-migrate ./cmd/migrate \
    && /out/ledger --version

############################
# Admin UI (static bundle)
############################
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS ui-build

ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:${PATH}" \
    NODE_ENV=production \
    VITE_API_BASE=${VITE_API_BASE:-/api/v1}

RUN corepack enable && corepack prepare pnpm@9.9.0 --activate

WORKDIR /ui
COPY web/admin/package.json web/admin/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

COPY web/admin/ ./
RUN pnpm run build \
    && find dist -name '*.map' -delete \
    && du -sh dist

############################
# Debug image with a shell, used by `make shell`
############################
FROM alpine:${ALPINE_VERSION} AS debug

RUN apk add --no-cache ca-certificates curl jq postgresql16-client \
    && mkdir -p /srv/ledger/static /var/lib/ledger

COPY --from=go-base /etc/passwd /etc/group /etc/
COPY --from=go-build --chown=10001:10001 /out/ /usr/local/bin/
COPY --from=ui-build --chown=10001:10001 /ui/dist/ /srv/ledger/static/

USER ledger
ENTRYPOINT ["/usr/local/bin/ledger"]
CMD ["serve", "--log-format=text", "--log-level=debug"]

############################
# Production runtime
############################
FROM gcr.io/distroless/static-debian12:${DISTROLESS_TAG} AS runtime

ARG VERSION=dev
ARG COMMIT=unknown

LABEL org.opencontainers.image.title="acme-ledger" \
      org.opencontainers.image.description="Double-entry ledger API for acme billing" \
      org.opencontainers.image.vendor="Acme Example Co" \
      org.opencontainers.image.source="https://git.acme.dev/platform/ledger" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

ENV TZ=UTC \
    LEDGER_HTTP_ADDR=":8080" \
    LEDGER_METRICS_ADDR=":9090" \
    LEDGER_STATIC_DIR=/srv/ledger/static \
    LEDGER_DATA_DIR=/var/lib/ledger \
    LEDGER_DB_POOL_SIZE=20 \
    GOMEMLIMIT=384MiB

COPY --from=go-base /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=go-base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=go-build --chown=10001:10001 /out/ledger /usr/local/bin/ledger
COPY --from=go-build --chown=10001:10001 /out/ledger-migrate /usr/local/bin/ledger-migrate
COPY --from=go-build --chown=10001:10001 /src/migrations /srv/ledger/migrations
COPY --from=ui-build --chown=10001:10001 /ui/dist /srv/ledger/static

WORKDIR /srv/ledger
VOLUME ["/var/lib/ledger"]
EXPOSE 8080/tcp 9090/tcp

USER 10001:10001
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["/usr/local/bin/ledger", "healthcheck", "--addr=127.0.0.1:8080"]

ENTRYPOINT ["/usr/local/bin/ledger"]
CMD ["serve", "--config=/srv/ledger/config.yaml"]
