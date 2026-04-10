## Language Definition Schema

Language grammars are defined in a declarative, serializable format. This format is designed to be an intuitive abstraction, hiding the underlying complexity of the state machine from the grammar author.

### Top-Level Structure

A language definition is a JSON object with two root properties:

- `"name"`: A string identifying the language (e.g., `"javascript"`).
- `"states"`: An object where each key is a state name (e.g., `"main"`, `"template_literal"`) and the value is an object containing a `rule` property that is an array of rules.

The first state defined in the states object is implicitly the initial state for tokenization.

```JSON
{
  "name": "javascript",
  "groups": { ... },
  "states": {
    "main": {
      "rules": [ /* rules for the main state */ ],
    },
    "template_literal":{
      "rules": [ /* rules for the template_literal state */ ]
    }
  }
}
```

### Rule Object Structure

Each state is defined by an array of rule objects. The engine evaluates these rules in the order they appear in the array. A rule object can contain the following properties:

#### Matchers

A rule must contain exactly one matcher property:

- `"match"`: Matches an exact string or an array of strings. Ideal for keywords, operators, and other fixed sequences.
  - `{ match: "const", token: "keyword" }`
  - `{ match: ["+", "-", "*", "/"], token: "operator" }`
- `"range"`: Matches a single character if it falls within a specified range or set of ranges.
  - `{ "range": ["a", "z"], "token": "identifier" }`
  - `{ "range": [["0", "9"], ["A", "Z"]], "token": "hex*digit" }`
- `match_within`: matches between two delimeters with an optonal escape character.
  - `{ match_within: { start: "'", end: "'", escape: "\\"}, token: "string" }`
  - `multiline` (default `true`): when `false`, the match stops at a newline (the string does not span lines).

#### Actions

A rule specifies actions to be taken upon a successful match:

- `"token"`: An optional string that defines the token type for the matched text (e.g., `"keyword"`, `"string"`). If `token` is not present then the pointer will not be progressed and no token will be generated.
- `"state"`: Pushes a new state onto the stack. This is used with begin/end rules to apply a different set of rules to the content between the delimiters. It can also be used with a match rule to handle recursive language constructs. A state can be progressed without generating a token and consuming the current character.
- `"exit"`: A pop operation. `exit` can only be `true`.
  - `{ "match": "}", "token": "punctuation", "exit": true }`

#### Triggering modes to handle ambiguity

A rule can optionally have a `mode` property that determines the behaviour of the tokenizer. This can be `tokenize` and `probe`

By default the mode is `tokenize` and will progress the pointer and generate tokens if a `token` is defined

In some cases it isn't possible to know what you are dealing with until you enter a disambiguating token, lets use CSS as an example. CSS has simple syntax but is highly recursive, lets take the following valid CSS:

```css
div {
	a:hover one two three {
		a: hover one two three;
	}
}
```

After we enter the `div` block it is impossible to know if `a:hover one two three` is a chain of selectors or a property and a value until we see either a `{`, `;`, `}` or EOF. Normal states without tokens (transition only states) aren't useful here because we actually need to continue scanning the input stream. In order to disambiguate these cases, twinkleplop supports `probing` a kind of controlled backtracking . When `mode: probe` states will transition as normal and characters will be matched but upon moving to a state that has a `mode: tokenise` the pointer will reset to the index it had when `mode: probe` was initialised. Probe states are special in that they will continue to consume characters, even if there is no match until either a match is found and EOF is reach. If EOF is reached we transition to the `fallback` state.

This is the format:

```js
probe_identifier: {
  mode: "probe",
  fallback: "property",
  // notice that the rules are only positive matches.
  // this state will cycle through the input until there is a match or EOF
  rules: [
    {
      match: "{",
      state: "selector",
    },
    {
      match: [";", "}"],
      state: "property",
    },
  ],
},
```

An example can illustrate:

After entering the div and working through whitespace we are here:

```css
...
v
a:hover one two three {
    a:hover one two three;
  }
}
```

We cannot determine the token type at this point so we enter probe mode. We then progress until we reach a disambiguating character, in the simple case `{` or `;`.

```css
...
                      v
a:hover one two three {
    a:hover one two three;
  }
}
```

At this point we know if it is a selector or a property. So we transition to the appropriate state (`selector`). Since that state has `mode: tokenize`, we go back to the index we were in when we initialised the probe mode but now with new information about our context.

```css
...
v
a:hover one two three {
    a:hover one two three;
  }
}
```

### Handling Ambiguity

- _Maximal Munch Principle:_ For ambiguities where one token is a prefix of another (e.g., `>` vs. `>>`, `#if` vs. `#ifdef`), the engine must adhere to the "longest match" rule. Character lookahead (10,568 ops/sec) outperforms complex trie matching (1,794 ops/sec) by 5.9x. Order rules from longest to shortest and use simple character lookahead.
- _Contextual Ambiguity:_ For ambiguities where a token's role depends on what follows it (e.g., CSS nested selectors), using the `mode` option to probe the state is utilised.

### Reusing rules

When design complex grammars you may find yourself reaching for the same rules again and again, while rules can simply ve pulled into a const and spread in various places, `twinkleplop` also has direct support for reusable blocks.

You can define a reusable state in the top level `groups` field.

```json
{
	"name": "javascript",
	"groups": {
		"resuable_state": {
			"mode": "",
			"rules": []
		}
	}
}
```

These groups than then be used and extended in state definitions:

```json
{
  "name": "javascript",
  "groups": {
    "reusable": { ... }
   },
  "states": {
    "main": {
      "extend": "resuable",
      "rules": [ /* rules for the main state */ ],
    },
  }
}
```

### Whitespace Handling

Whitespace between tokens is handled implicitly by the runtime engine and should be ignored.

## Token Naming Convention

The system adopts a simple, flat token naming convention, avoiding the complexity of dot-separated hierarchical scopes found in TextMate.9 Standard token names like `keyword`, `string`, `comment`, `number`, `operator`, `punctuation`, `property`, and `selector` are encouraged. This aligns with modern systems like VS Code's semantic highlighting and simplifies the creation of themes.
