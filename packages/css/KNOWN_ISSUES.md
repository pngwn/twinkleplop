# Known Issues - CSS Grammar

## Pseudo-selector tokenization after property without semicolon

### Issue
When a CSS property doesn't end with a semicolon (which is valid CSS), and the next rule starts with a selector that includes a pseudo-selector, the selector is incorrectly tokenized as a property.

### Example
```css
/* Problematic case */
.foo { color: red }  /* No semicolon */
button:active { }    /* button tokenized as property, not selector */

/* Works correctly with semicolon */
.foo { color: red; } /* With semicolon */
button:active { }    /* button correctly tokenized as selector */
```

### Root Cause
The issue stems from how the grammar handles state transitions:

1. When the `value` state encounters `}` (property without semicolon), it consumes the `}` and exits
2. Control returns to `block_property`, which then exits back to `block`
3. However, the `}` has already been consumed, so `block` never sees it and doesn't exit
4. The parser remains in `block` state instead of returning to `main`
5. When `button` is encountered, the probe logic in `block` finds `:` and incorrectly treats it as a property

### Technical Details
The grammar format doesn't support exiting multiple state levels at once. When `value` sees `}`, it needs to:
- Exit the `value` state
- Exit the `block_property` state
- Exit the `block` state back to `main`

But the grammar can only express a single exit.

### Workarounds
1. **Always use semicolons** - This is CSS best practice anyway
2. **Add a comment or whitespace** between rules to help the parser reset

### Potential Solutions (Future)
1. **Modify grammar format** - Add support for multi-level exits
2. **Make probe states ephemeral** - Probe states should not be part of the state stack; they should only disambiguate then disappear
3. **Change tokenizer architecture** - Probe mode should be truly read-only, not affecting state transitions
4. **State-level mode property** - Instead of `mode` on individual rules, make it a property of the state itself
5. **Special exit tokens** - Add a way to specify that consuming certain tokens should exit multiple levels

### Impact
- Low - Most well-formatted CSS includes semicolons
- The issue only occurs in specific edge cases
- Generated tokens are still valid, just incorrectly categorized