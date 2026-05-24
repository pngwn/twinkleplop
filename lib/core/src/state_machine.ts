// state_machine — minimal token-stream finite state machine with claim
// emission. data-driven primitive: takes a config describing enter/exit
// triggers and a "claim while in mode" rule. for v0 the machine has two
// states (in-mode / out-of-mode) and one claim target. richer machines
// (multiple modes, snapshot ops, sub-state lookaheads) are out of scope.
//
// runs as a claim producer so multiple state_machine stages can batch
// with each other and with rewrite_types via the standard pipeline.

import { as_claim_producer } from "./reclassifier";
import type {
  ClaimFn,
  ClaimingReclassifier,
  StateMachineConfig,
} from "./types";

export function state_machine(config: StateMachineConfig): ClaimingReclassifier {
  const enter_specs = config.enter_on;
  const exit_specs = config.exit_on;
  const claim_types_names = config.claim_token_types;
  const claim_target_name = config.claim_type;
  const precedence = config.precedence;

  const fn: ClaimFn = (input, tokens, token_types, sink) => {
    // resolve enter/exit/claim token type ids once per call. enter and exit
    // entries that reference missing types simply don't fire.
    const enter_table: { type_id: number; texts: Set<string> }[] = [];
    for (const e of enter_specs) {
      const id = token_types.indexOf(e.type);
      if (id < 0) continue;
      enter_table.push({ type_id: id, texts: new Set(e.texts) });
    }
    const exit_table: { type_id: number; texts: Set<string> | null }[] = [];
    for (const e of exit_specs) {
      const id = token_types.indexOf(e.type);
      if (id < 0) continue;
      exit_table.push({ type_id: id, texts: e.texts !== undefined ? new Set(e.texts) : null });
    }
    const claim_type_ids: number[] = [];
    for (const name of claim_types_names) {
      const id = token_types.indexOf(name);
      if (id >= 0) claim_type_ids.push(id);
    }
    let claim_target_id = token_types.indexOf(claim_target_name);
    if (claim_target_id < 0) {
      claim_target_id = token_types.length;
      token_types.push(claim_target_name);
    }
    if (claim_type_ids.length === 0) return;

    const comment_id = token_types.indexOf("comment");
    const n = tokens.length / 3;
    let in_mode = false;

    for (let i = 0; i < n; i++) {
      const base = i * 3;
      const tid = tokens[base];
      if (tid === comment_id) continue;
      const text = input.slice(tokens[base + 1], tokens[base + 2]);

      if (in_mode) {
        // exit on a configured terminator.
        let exited = false;
        for (const e of exit_table) {
          if (e.type_id !== tid) continue;
          if (e.texts === null || e.texts.has(text)) {
            exited = true;
            break;
          }
        }
        if (exited) {
          in_mode = false;
          continue;
        }
        // emit a claim if this token type is in the claim set.
        for (let k = 0; k < claim_type_ids.length; k++) {
          if (claim_type_ids[k] === tid) {
            sink.emit(i, claim_target_id, precedence);
            break;
          }
        }
        continue;
      }

      // out of mode: check enter triggers.
      for (const e of enter_table) {
        if (e.type_id !== tid) continue;
        if (e.texts.has(text)) {
          in_mode = true;
          break;
        }
      }
    }
  };

  return as_claim_producer(fn);
}
