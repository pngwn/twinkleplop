---
"@twinkleplop/core": patch
---

Fix missing stack information in the debug introspector's events. Push, pop, per-character and probe-entry events now report `stack_depth`, and each per-character `full_state_path` includes the states on the stack as well as the current one. Probe-entry events report the `rule_index` that started the probe, the completion event reports `final_stack_depth`, and each state session records its nesting `depth`.
