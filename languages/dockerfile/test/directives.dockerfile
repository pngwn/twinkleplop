# syntax=docker/dockerfile:1.7
# escape=`
# check=skip=JSONArgsRecommended;error=true
# second comment line here
FROM node:22 AS build
RUN echo one `
  && echo two
