# ---- unit 1 ----
#!/usr/bin/env bash
# greet every user in the directory
set -euo pipefail
readonly GREETING="Hello, \$USER!"
TAB=$'\thello\n'
files=( *.sh )
for f in "${files[@]}"; do
  if [[ $f =~ ^[a-z]+\.sh$ && -r "$f" ]]; then
    printf '%s\t%s\n' "$GREETING" "$f"
    count=$(( ${#f} + 16#ff ))
    true && echo "count=$count$TAB"
  fi
done


# ---- unit 2 ----
#!/usr/bin/env bash
# greet every user in the directory
set -euo pipefail
readonly GREETING="Hello, \$USER!"
TAB=$'\thello\n'
files=( *.sh )
for f in "${files[@]}"; do
  if [[ $f =~ ^[a-z]+\.sh$ && -r "$f" ]]; then
    printf '%s\t%s\n' "$GREETING" "$f"
    count=$(( ${#f} + 16#ff ))
    true && echo "count=$count$TAB"
  fi
done


# ---- unit 3 ----
#!/usr/bin/env bash
# greet every user in the directory
set -euo pipefail
readonly GREETING="Hello, \$USER!"
TAB=$'\thello\n'
files=( *.sh )
for f in "${files[@]}"; do
  if [[ $f =~ ^[a-z]+\.sh$ && -r "$f" ]]; then
    printf '%s\t%s\n' "$GREETING" "$f"
    count=$(( ${#f} + 16#ff ))
    true && echo "count=$count$TAB"
  fi
done
