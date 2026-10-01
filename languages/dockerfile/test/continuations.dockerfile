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
