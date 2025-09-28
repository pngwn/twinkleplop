# JavaScript Regex vs Division Disambiguation Strategy

## The Problem
In JavaScript, the `/` character can mean either:
1. Start of a regex literal: `/pattern/flags`
2. Division operator: `a / b`
3. Division assignment: `a /= b`

The interpretation depends on the preceding context.

## Current Approach Issues
1. The `slash_disambiguation` probe state is only used from `main` state
2. State transitions are inconsistent
3. Some contexts are not properly handled

## Correct Disambiguation Rules

### `/` should be interpreted as REGEX after:
- Operators: `=`, `+`, `-`, `*`, `<`, `>`, `!`, `&`, `|`, `^`, `~`, `%`, `?`, `:`
- Opening brackets: `(`, `[`, `{`
- Commas and semicolons: `,`, `;`
- Keywords that expect expressions: `return`, `throw`, `typeof`, `new`, `void`, `delete`, `in`, `of`, `instanceof`, `yield`, `await`, `case`, `else`
- Start of statement/file
- After `//` comments (on new line)
- After `/* */` comments

### `/` should be interpreted as DIVISION after:
- Identifiers: `foo / bar`
- Numbers: `10 / 2`
- Closing brackets: `)`, `]`, `}`
- String/template literals: `"str" / 2`, `` `tmp` / 2``
- Boolean/null/undefined literals: `true / false`
- `this` and `super` keywords
- Most other keywords that act as values: `function`, `class`, etc.
- After `++` and `--` operators

## Improved State Machine Design

### Three Main States:
1. **`main`** (or any initial state) - defaults to regex interpretation
2. **`expect_operator`** - after values, where `/` means division  
3. **`expect_expression`** - after operators, where `/` means regex

### State Transitions:

From any state:
- After identifiers → `expect_operator`
- After numbers → `expect_operator`
- After `)`, `]`, `}` → `expect_operator`
- After strings/templates → `expect_operator`
- After literals (true, false, null, undefined) → `expect_operator`
- After `this`, `super` → `expect_operator`

- After operators → `expect_expression`
- After `(`, `[`, `{` → `expect_expression`
- After `,`, `;` → `expect_expression`
- After expression-expecting keywords → `expect_expression`

### Special Cases:
1. **Division assignment `/=`**: Should be recognized as a single token
2. **Comments between tokens**: Should preserve the state
3. **Whitespace**: Should preserve the state
4. **Method calls**: `foo()` → `expect_operator`, `foo(` → `expect_expression`

## Implementation Notes

Rather than having separate `after_operator` and `after_value` states with duplicated rules, we should:

1. Use a shared state design with conditional rules based on context
2. Or use a flag/mode in the tokenizer to track expression vs operator expectation
3. Ensure `/=` is checked before `/` in all contexts

The key is consistency - every rule that produces a token should also set the appropriate expectation for what follows.