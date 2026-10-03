dev@build-01:~/src/edge-stack$ git fetch origin --tags --prune
From github.com:acme/edge-stack
 - [deleted]         (none)     -> origin/p/retry-budget
   4b1c9e2..a77d03f  main       -> origin/main
 * [new tag]         v0.14.2    -> v0.14.2
dev@build-01:~/src/edge-stack$ git switch main && git pull --ff-only
Switched to branch 'main'
Your branch is behind 'origin/main' by 6 commits, and can be fast-forwarded.
Updating 4b1c9e2..a77d03f
Fast-forward
 crates/router/src/balance.rs     | 48 +++++++++++++++++++++++-------
 crates/router/src/health.rs      | 17 ++++++-----
 crates/store/src/lease.rs        | 92 ++++++++++++++++++++++++++++++++++++++++++++++++++
 packages/cli/src/commands/up.ts  | 11 ++++---
 packages/cli/package.json        |  2 +-
 5 files changed, 143 insertions(+), 27 deletions(-)
 create mode 100644 crates/store/src/lease.rs
dev@build-01:~/src/edge-stack$ git log --oneline --no-decorate v0.14.2..HEAD
a77d03f router: drain connections before swapping the upstream set
9e04b51 store: add lease renewal with jittered backoff
71c2d8a cli: print the bound address when --port 0 is used
3f8a0e6 health: treat 429 as degraded, not down
c5d1b7f deps: bump tokio to 1.40.0
e2a6f19 ci: cache the cargo registry between jobs
dev@build-01:~/src/edge-stack$ git status --short --branch
## main...origin/main
dev@build-01:~/src/edge-stack$ pnpm install --frozen-lockfile
Scope: all 9 workspace projects
Lockfile is up to date, resolution step is skipped
Packages: +612
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 612, reused 612, downloaded 0, added 612, done

devDependencies:
+ @changesets/cli 2.27.8
+ typescript 5.6.2
+ vitest 2.1.1

Done in 3.4s
dev@build-01:~/src/edge-stack$ pnpm -r --filter "./packages/*" run build
Scope: 5 of 9 workspace projects
packages/proto build$ tsc -p tsconfig.build.json
packages/proto build: Done
packages/client build$ tsc -p tsconfig.build.json && node scripts/copy-assets.mjs
packages/client build: copied 4 assets to dist/
packages/client build: Done
packages/cli build$ tsup src/index.ts --format esm --dts --clean
packages/cli build: CLI Building entry: src/index.ts
packages/cli build: ESM dist/index.js     41.82 KB
packages/cli build: DTS dist/index.d.ts   3.10 KB
packages/cli build: Done
packages/dashboard build$ vite build
packages/dashboard build: vite v5.4.6 building for production...
packages/dashboard build: transforming...
packages/dashboard build: 318 modules transformed.
packages/dashboard build: dist/index.html                 0.61 kB | gzip:  0.38 kB
packages/dashboard build: dist/assets/index-Bq3x9T1a.css  14.20 kB | gzip:  3.71 kB
packages/dashboard build: dist/assets/index-D8kPq2Lm.js  212.47 kB | gzip: 68.09 kB
packages/dashboard build: built in 2.91s
packages/dashboard build: Done
dev@build-01:~/src/edge-stack$ cargo test --workspace --release -q 2>&1 | tail -n 12

running 214 tests
.......................................................................................
.......................................................................................
........................................
test result: ok. 214 passed; 0 failed; 3 ignored; 0 measured; 0 filtered out; finished in 6.82s

running 9 tests
.........
test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.41s

dev@build-01:~/src/edge-stack$ pnpm vitest run --reporter=dot --exclude "**/fixtures/**"

 RUN  v2.1.1 /home/dev/src/edge-stack

..................................................................................
.......................................

 Test Files  38 passed (38)
      Tests  412 passed | 2 skipped (414)
   Start at  14:02:31
   Duration  9.17s (transform 1.20s, setup 0ms, collect 4.88s, tests 11.02s)

dev@build-01:~/src/edge-stack$ pnpm changeset status --verbose
Packages to be bumped at patch:

- @acme/cli 0.14.2 => 0.14.3
  - .changeset/quiet-lamps-wave.md
- @acme/client 0.14.2 => 0.14.3
  - .changeset/brave-owls-sing.md

dev@build-01:~/src/edge-stack$ pnpm changeset version
Info all files have been updated. Review them and commit at your leisure
dev@build-01:~/src/edge-stack$ git diff --stat
 .changeset/brave-owls-sing.md    |  5 -----
 .changeset/quiet-lamps-wave.md   |  5 -----
 packages/cli/CHANGELOG.md        |  8 ++++++++
 packages/cli/package.json        |  2 +-
 packages/client/CHANGELOG.md     |  6 ++++++
 packages/client/package.json     |  2 +-
 6 files changed, 16 insertions(+), 12 deletions(-)
dev@build-01:~/src/edge-stack$ sed -i 's/^version = "0.14.2"/version = "0.14.3"/' Cargo.toml
dev@build-01:~/src/edge-stack$ grep -n '^version' Cargo.toml crates/*/Cargo.toml
Cargo.toml:17:version = "0.14.3"
dev@build-01:~/src/edge-stack$ cargo update -w -q && git add -A
dev@build-01:~/src/edge-stack$ git commit -m "chore: release v0.14.3" \
>   -m "router lease renewal, health 429 handling, cli --port 0 output"
[main 0d93c41] chore: release v0.14.3
 9 files changed, 31 insertions(+), 18 deletions(-)
 delete mode 100644 .changeset/brave-owls-sing.md
 delete mode 100644 .changeset/quiet-lamps-wave.md
dev@build-01:~/src/edge-stack$ git tag -a v0.14.3 -m "v0.14.3" && git push --follow-tags origin main
Enumerating objects: 27, done.
Counting objects: 100% (27/27), done.
Delta compression using up to 16 threads
Compressing objects: 100% (12/12), done.
Writing objects: 100% (14/14), 2.31 KiB | 2.31 MiB/s, done.
Total 14 (delta 9), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (9/9), completed with 8 local objects.
To github.com:acme/edge-stack.git
   a77d03f..0d93c41  main -> main
 * [new tag]         v0.14.3 -> v0.14.3
dev@build-01:~/src/edge-stack$ cd target/release && ls -la edge-*
-rwxr-xr-x 1 dev dev 18421760 Oct  3 14:06 edge-router
-rwxr-xr-x 1 dev dev  9873408 Oct  3 14:06 edge-store
-rw-r--r-- 1 dev dev     2214 Oct  3 14:06 edge-router.d
-rw-r--r-- 1 dev dev     1907 Oct  3 14:06 edge-store.d
dev@build-01:~/src/edge-stack/target/release$ for bin in edge-router edge-store; do
>   tar -czf "$bin-v0.14.3-x86_64-linux.tar.gz" "$bin"
>   sha256sum "$bin-v0.14.3-x86_64-linux.tar.gz" >> SHA256SUMS
> done
dev@build-01:~/src/edge-stack/target/release$ cat SHA256SUMS
3b7f0c2e9a1d84f6c05e2b7a9d13f8e4a6c2b0d9e7f1a3c5b8d0e2f4a6c8b0d2  edge-router-v0.14.3-x86_64-linux.tar.gz
9e1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  edge-store-v0.14.3-x86_64-linux.tar.gz
dev@build-01:~/src/edge-stack/target/release$ gh release create v0.14.3 \
>   --title "v0.14.3" \
>   --notes-file ../../packages/cli/CHANGELOG.md \
>   --verify-tag \
>   ./*.tar.gz SHA256SUMS
https://github.com/acme/edge-stack/releases/tag/v0.14.3
dev@build-01:~/src/edge-stack/target/release$ cd - >/dev/null
dev@build-01:~/src/edge-stack$ pnpm -r --filter "@acme/*" publish --access public --no-git-checks
+ @acme/client@0.14.3
+ @acme/cli@0.14.3
dev@build-01:~/src/edge-stack$ npm view @acme/cli versions --json | jq -r '.[-3:][]'
0.14.1
0.14.2
0.14.3
dev@build-01:~/src/edge-stack$ curl -fsS https://edge.acme.dev/healthz | jq '{version, uptime_s, upstreams: (.upstreams | length)}'
{
  "version": "0.14.2",
  "uptime_s": 518402,
  "upstreams": 12
}
dev@build-01:~/src/edge-stack$ ssh deploy@edge-01.acme.dev 'sudo systemctl restart edge-router && systemctl is-active edge-router'
active
dev@build-01:~/src/edge-stack$ sleep 5; curl -fsS https://edge.acme.dev/healthz | jq -r .version
0.14.3
dev@build-01:~/src/edge-stack$ journalctl -u edge-router --since "2 min ago" -o cat | grep -E 'WARN|ERROR' | wc -l
0
$ echo "released v0.14.3 at $(date -u +%H:%MZ)" | tee -a ~/release.log
released v0.14.3 at 14:11Z
$ exit
