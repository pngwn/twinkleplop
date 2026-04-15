#!/bin/bash
# redirection operators

# basic
cmd < input.txt
cmd > output.txt
cmd >> output.txt
cmd <> rw.txt
cmd >| force.txt

# fd-prefixed
cmd 2> errors.log
cmd 2>&1
cmd >&2
cmd <&0

# combined
cmd &> all.log
cmd &>> all.log

# here-string
cat <<< "hello"

# heredoc
cat <<EOF
literal text
EOF

# heredoc tab-strip
cat <<-END
	stripped
	END

# heredoc quoted delimiter: no expansion (limitation documented)
cat <<'DONE'
no $interpolation
DONE

# close fd
exec 3>&-
