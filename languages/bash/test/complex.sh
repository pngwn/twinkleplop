#!/usr/bin/env bash
# real-world example combining many features

set -euo pipefail

readonly LOGFILE="${LOGFILE:-/tmp/app.log}"
readonly COUNT=${1:-10}

log_error() {
    local msg="$1"
    printf '%s ERROR: %s\n' "$(date +%Y-%m-%dT%H:%M:%S)" "$msg" >&2
}

process_file() {
    local file="$1"
    if [[ ! -r "$file" ]]; then
        log_error "cannot read: $file"
        return 1
    fi
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        echo "processing: $line"
    done < "$file"
}

main() {
    local -i failures=0
    for f in "$@"; do
        if ! process_file "$f"; then
            failures=$((failures + 1))
        fi
    done
    if (( failures > 0 )); then
        printf '%d failures\n' "$failures" >&2
        exit 1
    fi
}

main "$@"
