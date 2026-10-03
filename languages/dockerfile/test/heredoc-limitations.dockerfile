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
