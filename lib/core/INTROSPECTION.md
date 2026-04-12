# Tokenizer Introspection

This document describes the introspectable tokenizer system that allows debugging and understanding how tokens are generated.

## Overview

The introspectable tokenizer provides a way to understand:
- How each token was tokenized
- What state the tokenizer was in at each position
- What rules were matched
- State transitions that occurred
- Probe mode operations

## Architecture

### Files

- `tokenizer-introspectable.js` - Source tokenizer with conditional introspection code
- `introspector.js` - Introspector class for collecting debug information
- `build-tokenizer.js` - Build script to generate debug/production versions
- `tokenizer.debug.js` - Generated debug version with introspection enabled
- `tokenizer.production.js` - Generated production version with introspection stripped

### Build System

The build system uses conditional compilation to create two versions:

1. **Production Build** (`npm run build:tokenizer:prod`)
   - Strips all introspection code between `// INTROSPECTION_START` and `// INTROSPECTION_END`
   - Removes the introspector parameter
   - Results in zero performance overhead

2. **Debug Build** (`npm run build:tokenizer:debug`)
   - Replaces `process.env.INTROSPECTION === "true"` with `true`
   - Includes all introspection hooks
   - Exports `TokenizerIntrospector` class

## Grammar Mapper

The `GrammarMapper` class maps compiled grammar indices back to human-readable names from your original grammar. This makes introspection output much more understandable.

### Quick Example

```javascript
import { GrammarMapper } from "./grammar-mapper.js";

// Your original grammar
const grammar = {
  name: "mylang",
  states: {
    main: { rules: [...] },
    comment: { rules: [...] }
  }
};

// Compile it
const compiled = compile(grammar);

// Create mapper
const mapper = new GrammarMapper(grammar, compiled);

// Create introspector with readable output
const introspector = mapper.createEnhancedIntrospector(TokenizerIntrospector, {
  enhancedLogging: true  // Automatic readable logging
});

// Or manually map names
console.log(mapper.getStateName(0));  // "main" instead of "state_0"
console.log(mapper.getRuleName(0, 2)); // "/\w+/ → identifier" instead of "rule_2"

// Generate analysis report
const report = mapper.generateReport(introspector);
console.log(report);  // Human-readable tokenization report
```

### GrammarMapper Features

- **State name mapping**: `state_0` → `main`
- **Rule descriptions**: `rule_2` → `/\w+/ → identifier ↓ string`
- **Token name mapping**: `token_5` → `string.delimiter`
- **Analysis reports**: Summary of tokenization with grammar context
- **Rule validation**: Find unused rules in your grammar

### Without vs With GrammarMapper

```javascript
// WITHOUT mapper - cryptic output:
"Matched rule_5 in state_0"
"Push: state_0 → state_3"
"Token: token_2 at [10:15]"

// WITH mapper - readable output:
"Matched /\w+/ → identifier in main"
"Push: main → string_content"
"Token: string.delimiter at [10:15]"
```

## Usage

### Basic Usage

```javascript
import { execSync } from "child_process";
import { compile } from "./compiler.js";

// Build debug version
execSync("npm run build:tokenizer:debug", { stdio: "ignore" });

// Import debug version
const { tokenize, TokenizerIntrospector } = await import("./tokenizer.debug.js");

// Create introspector with custom logging
const introspector = new TokenizerIntrospector({
  log: null,            // Custom logging function (null = no logging)
  collectHistory: true,
  maxHistorySize: 10000
});

// Examples of different logging options:

// 1. No logging (default)
const introspector1 = new TokenizerIntrospector();

// 2. Console logging
const introspector2 = new TokenizerIntrospector({
  log: console.log
});

// 3. Custom logger with filtering
const introspector3 = new TokenizerIntrospector({
  log: (type, data) => {
    // Only log token emissions
    if (type.includes("TOKEN")) {
      console.log(`${type}: ${data.tokenName || data.tokenType}`);
    }
  }
});

// 4. File logging
import fs from "fs";
const logStream = fs.createWriteStream("tokenizer.log");
const introspector4 = new TokenizerIntrospector({
  log: (type, data) => {
    logStream.write(`[${new Date().toISOString()}] ${type}: ${JSON.stringify(data)}\n`);
  }
});

// 5. Structured logging with a logger library
import winston from "winston";
const logger = winston.createLogger({ /* config */ });
const introspector5 = new TokenizerIntrospector({
  log: (type, data) => {
    logger.debug("tokenizer", { type, ...data });
  }
});

// Backwards compatibility - logToConsole still works
const introspector6 = new TokenizerIntrospector({
  logToConsole: true  // Equivalent to log: console.log
});

// Tokenize with introspection
const result = tokenize(input, compiledGrammar, introspector);

// Access collected data
console.log(introspector.tokens);           // All emitted tokens
console.log(introspector.stateTransitions); // State changes
console.log(introspector.ruleMatches);      // Matched rules
```

### Introspector API

#### Query Methods

- `getTokenAtPosition(pos)` - Find token at character position
- `getTokenHistory(tokenIndex)` - Get full history for a token
- `getStateAtPosition(pos)` - Find state at character position
- `getRulesAppliedAt(pos)` - Get rules matched at position
- `getProbeEvents()` - Get probe mode events

#### Report Generation

- `generateReport()` - Generate summary report
- `generateTokenTrace(tokenIndex)` - Generate detailed trace for a token

### Events Tracked

The introspector tracks these events:

- `BEFORE_CHAR` - Before processing each character
- `MATCHED_RULE` - When a rule matches
- `EMITTED_TOKEN` - When a token is emitted
- `EXTENDED_TOKEN` - When a token is extended (coalesced)
- `PUSHED_STATE` - When state is pushed to stack
- `POPPED_STATE` - When state is popped from stack
- `TRANSITIONED_STATE` - Direct state transition
- `ENTER_PROBE` - Entering probe mode
- `EXIT_PROBE` - Exiting probe mode
- `FALLBACK_MATCH` - Fallback rule matched
- `NON_ASCII_MATCH` - Non-ASCII character matched

## Example

```javascript
// Find what token is at position 30
const token = introspector.getTokenAtPosition(30);
console.log(`Token at pos 30: ${token.tokenName} "${token.text}"`);

// Get detailed trace for token #5
const trace = introspector.generateTokenTrace(5);
console.log(trace);

// Generate full report
const report = introspector.generateReport();
console.log(`Processed ${report.summary.tokenCount} tokens`);
console.log(`State transitions: ${report.stateTransitions.length}`);
```

## Performance

The production build has **zero performance overhead** because all introspection code is completely removed at build time. The debug build adds overhead for:
- Event collection
- History tracking
- Method calls

Use the debug build only for development and debugging, never in production.

## Build Commands

```bash
# Build production version (no introspection)
npm run build:tokenizer:prod

# Build debug version (with introspection)
npm run build:tokenizer:debug

# Build current default
npm run build:tokenizer
```

## Notes

- The introspector requires a grammar compiled with the same compiler version
- Grammar structure should use `states.stateName.rules` array format
- The fallbackTransitions is a Uint8Array accessed by index: `currentState * 3`
- Always rebuild after modifying `tokenizer-introspectable.js`