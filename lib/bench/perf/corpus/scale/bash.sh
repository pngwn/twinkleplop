# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"


# ---- arithmetic.sh ----
#!/bin/bash
# arithmetic expansion and arithmetic command

x=$((1 + 2))
y=$(( 3 * 4 - 5 ))
z=$(( a ** 2 + b ** 2 ))

(( count++ ))
(( i = 0 ))
(( a < b && c > d ))

# bitwise
mask=$(( 0xff & 0x0f ))
shift=$(( 1 << 8 ))

# bases
hex=$(( 0xDEADBEEF ))
oct=$(( 077 ))
bin=$(( 2#1010 ))

# c-style for-loop head
for (( i=0; i<10; i++ )); do
    echo $i
done

# nested
r=$(( $(( a + b )) * c ))


# ---- arrays.sh ----
#!/bin/bash
# arrays

# indexed array
arr=(a b c d)
arr[4]=e
arr+=(f g)
echo ${arr[0]}
echo ${arr[@]}
echo ${arr[*]}
echo ${#arr[@]}
echo ${!arr[@]}
echo ${arr[@]:1:2}

# associative array
declare -A map
map=([foo]=1 [bar]=2)
map["key"]=value
echo ${map[foo]}
echo ${!map[@]}

# iteration
for key in "${!map[@]}"; do
    echo "$key=${map[$key]}"
done


# ---- basic.sh ----
#!/usr/bin/env bash
# simple greeting script
echo "Hello, World!"
echo 'single-quoted'
x=42
y=$((x + 8))
echo "x=$x y=$y"


# ---- complex.sh ----
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


# ---- conditionals.sh ----
#!/bin/bash
# [[ ]] conditional tests

[[ -e /etc/passwd ]]
[[ -f "$file" && -r "$file" ]]
[[ -z "$s" || -n "$t" ]]
[[ "$a" == "$b" ]]
[[ "$a" != pat* ]]
[[ "$a" =~ ^[0-9]+$ ]]
[[ "$a" < "$b" ]]
[[ $n -eq 42 ]]
[[ $n -lt 100 ]]
[[ ! -d /tmp || -w /tmp ]]
[[ ( -f a || -f b ) && -r c ]]
[[ -v varname ]]
[[ file1 -nt file2 ]]


# ---- expansions.sh ----
#!/bin/bash
# expansion forms: command, process, arithmetic, parameter

# command substitution
a=$(date)
b=$(ls -la | head)
c=`whoami`

# nested command substitution
d=$(echo $(hostname))
e=$(cmd1 | cmd2; cmd3)

# process substitution
diff <(sort file1) <(sort file2)
tee >(grep foo) >(grep bar) < input

# arithmetic
n=$((5 * 5))

# parameter expansion
e=${x:-default}
f=${x/pat/new}

# brace expansion
echo {a,b,c}
echo {1..10}
echo {01..20..2}
echo file{1,2,3}.txt

# tilde
cd ~
cd ~user
cd ~+
cd ~-


# ---- keywords.sh ----
#!/bin/bash
# reserved words and compound commands

if [ -f /etc/passwd ]; then
    echo yes
elif false; then
    echo no
else
    echo other
fi

for i in 1 2 3; do
    echo $i
done

while true; do
    break
done

until false; do
    continue
done

case "$x" in
    a) echo a ;;
    b|c) echo bc ;;
    *) echo other ;;
esac

select opt in a b c; do
    echo $opt
done

function foo {
    echo called
}

bar() {
    echo also_called
}

time sleep 0
coproc SORTER sort


# ---- pipelines.sh ----
#!/bin/bash
# pipelines and lists

ls | grep foo | wc -l
ls |& grep error
true && echo yes
false || echo no
cmd1; cmd2; cmd3
cmd1 & cmd2 &
! true
! [[ -f foo ]]
cmd1 && cmd2 || cmd3


# ---- redirections.sh ----
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


# ---- strings.sh ----
#!/bin/bash
# every string form

# single-quoted: literal
a='hello world'
b='no\nescape'
c=''

# double-quoted: interpolation
d="hello $USER"
e="x is $x and ${y}"
f="literal \$dollar \"quote\" \\backslash"
g="subst $(date) here"

# ansi-c: escape processing
h=$'line1\nline2\ttab'
i=$'quote\'embedded'
j=$'\x48\x69'

# locale-translated
k=$"Hello world"

# backtick legacy
l=`date`

# mixed concat — bash treats adjacent quoted/unquoted as one word
m="prefix"'middle'"$suffix"


# ---- variables.sh ----
#!/bin/bash
# variable references and special parameters

# simple refs
echo $PATH
echo ${HOME}
echo ${USER:-default}

# special parameters
echo $@ $*
echo "$#" "$?"
echo $$ $! $_

# positional
echo $0 $1 $2

# braced with operators
echo ${var:-default}
echo ${var:=assign}
echo ${var:?required}
echo ${var:+alternate}

# substring
echo ${name:0:5}
echo ${name:-1}

# pattern ops
echo ${file%.txt}
echo ${file##*/}
echo ${path//:/;}
echo ${path/#prefix/new}

# case transform
echo ${str^^}
echo ${str,,}

# transformations
echo ${var@U}
echo ${var@Q}

# indirect
echo ${!varname}


#!/usr/bin/env bash
#
# Blue/green deploy driver. Builds the image, pushes it, flips the router at
# the end and rolls back on any failed health gate.

set -Eeuo pipefail
shopt -s inherit_errexit nullglob globstar

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly REPO_ROOT="${SCRIPT_DIR%/scripts}"
readonly REGISTRY="${REGISTRY:-ghcr.io/acme}"
readonly APP="${APP:-edge-router}"
readonly TIMEOUT_SECS="${TIMEOUT_SECS:-600}"

declare -A COLOURS=(
  [red]=$'\033[31m'
  [green]=$'\033[32m'
  [yellow]=$'\033[33m'
  [reset]=$'\033[0m'
)

declare -a CLEANUP_CMDS=()
declare -i FAILED=0

log() {
  local level="$1"; shift
  local colour="${COLOURS[reset]}"
  case "$level" in
    error) colour="${COLOURS[red]}" ;;
    warn)  colour="${COLOURS[yellow]}" ;;
    ok)    colour="${COLOURS[green]}" ;;
  esac
  printf '%s[%s]%s %s: %s\n' "$colour" "$(date -u +%H:%M:%S)" "${COLOURS[reset]}" "$level" "$*" >&2
}

die() {
  log error "$*"
  exit 1
}

on_exit() {
  local -i code=$?
  local cmd
  for ((i = ${#CLEANUP_CMDS[@]} - 1; i >= 0; i--)); do
    cmd="${CLEANUP_CMDS[i]}"
    log warn "cleanup: ${cmd}"
    eval "$cmd" || log error "cleanup failed: ${cmd}"
  done
  if ((code != 0)); then
    log error "exiting with status ${code}"
  fi
  exit "$code"
}
trap on_exit EXIT
trap 'die "interrupted"' INT TERM

defer() { CLEANUP_CMDS+=("$*"); }

usage() {
  cat <<-'EOF'
	usage: deploy.sh [options] <environment>

	  -t, --tag <tag>       image tag (default: git describe)
	  -n, --dry-run         print the plan, change nothing
	  -s, --skip-tests      skip the pre-deploy test gate
	  -f, --force           deploy even with a dirty worktree
	  -h, --help            this message

	environment is one of: staging, canary, production
	EOF
}

require() {
  local missing=()
  for bin in "$@"; do
    command -v -- "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  ((${#missing[@]} == 0)) || die "missing required tools: ${missing[*]}"
}

git_tag() {
  local tag
  if ! tag=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null); then
    tag="sha-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
  fi
  printf '%s' "${tag//[^a-zA-Z0-9._-]/-}"
}

worktree_clean() {
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]]
}

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT_SECS)) status
  while ((SECONDS < deadline)); do
    status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$url" || printf '000')
    case "$status" in
      2??) log ok "healthy: ${url} (${status})"; return 0 ;;
      000) log warn "no response from ${url}" ;;
      *)   log warn "unhealthy: ${url} -> ${status}" ;;
    esac
    sleep $((RANDOM % 3 + 2))
  done
  return 1
}

build_image() {
  local tag="$1" ref="${REGISTRY}/${APP}:${tag}"
  log info "building ${ref}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --cache-from "type=registry,ref=${REGISTRY}/${APP}:buildcache" \
    --cache-to "type=registry,ref=${REGISTRY}/${APP}:buildcache,mode=max" \
    --label "org.opencontainers.image.revision=$(git -C "$REPO_ROOT" rev-parse HEAD)" \
    --tag "$ref" \
    --push \
    "$REPO_ROOT"
  printf '%s' "$ref"
}

current_colour() {
  kubectl -n "$1" get service "${APP}" -o jsonpath='{.spec.selector.colour}' 2>/dev/null || printf 'blue'
}

main() {
  local env="" tag="" dry_run=0 skip_tests=0 force=0

  while (($# > 0)); do
    case "$1" in
      -t|--tag)        tag="${2:?--tag needs a value}"; shift 2 ;;
      -n|--dry-run)    dry_run=1; shift ;;
      -s|--skip-tests) skip_tests=1; shift ;;
      -f|--force)      force=1; shift ;;
      -h|--help)       usage; return 0 ;;
      --)              shift; break ;;
      -*)              usage >&2; die "unknown flag: $1" ;;
      *)               env="$1"; shift ;;
    esac
  done

  [[ -n "$env" ]] || { usage >&2; die "environment is required"; }
  [[ "$env" =~ ^(staging|canary|production)$ ]] || die "bad environment: ${env}"

  require docker kubectl git curl jq

  if ((force == 0)) && ! worktree_clean; then
    die "worktree is dirty; commit or pass --force"
  fi

  tag="${tag:-$(git_tag)}"
  log info "deploying ${APP}:${tag} to ${env} (dry_run=${dry_run})"

  if ((skip_tests == 0)); then
    log info "running test gate"
    (cd "$REPO_ROOT" && make test) || die "tests failed"
  fi

  local live next image
  live=$(current_colour "$env")
  next=$([[ "$live" == "blue" ]] && printf 'green' || printf 'blue')
  log info "live=${live} next=${next}"

  if ((dry_run)); then
    log ok "dry run complete; would deploy to ${next}"
    return 0
  fi

  image=$(build_image "$tag")
  defer "kubectl -n '${env}' rollout undo deployment/${APP}-${next} || true"

  kubectl -n "$env" set image "deployment/${APP}-${next}" "${APP}=${image}" --record
  kubectl -n "$env" rollout status "deployment/${APP}-${next}" --timeout="${TIMEOUT_SECS}s"

  local endpoint="https://${next}.${env}.internal/healthz"
  wait_for "$endpoint" || die "health gate failed for ${next}"

  local -a checks=(/readyz /metrics /version)
  for path in "${checks[@]}"; do
    wait_for "https://${next}.${env}.internal${path}" || die "check ${path} failed"
  done

  kubectl -n "$env" patch service "$APP" \
    --type=merge \
    --patch "$(jq -nc --arg c "$next" '{spec:{selector:{colour:$c}}}')"

  CLEANUP_CMDS=()
  log ok "traffic now on ${next} (${image})"
}

main "$@"
