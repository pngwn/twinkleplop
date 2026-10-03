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
