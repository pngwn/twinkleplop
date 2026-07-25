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
