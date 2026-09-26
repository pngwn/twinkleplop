---
"@twinkleplop/yaml": patch
---

Block scalars (`|` and `>`) now end at the first line indented less than their content, so a block under a sequence item or nested key no longer runs on until a line at column 0. This fixes the common GitHub Actions `steps: - run: |` shape.
