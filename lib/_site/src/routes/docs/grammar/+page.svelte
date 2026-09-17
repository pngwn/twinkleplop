<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { ts } from "$lib/docs/highlighters";

	const skeleton_src = `import {
  match, on, keyword, within, fallback,
  enter, goto, leave, to, range, LETTER, DIGIT,
} from "@twinkleplop/core";
import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

export default define_grammar({
  name: "mylang",
  states: {
    main: {
      rules: [
        within("//", "\\n", TOKENS.comment),
        within("/*", "*/", TOKENS.comment),
        within('"', '"', TOKENS.string, { escape: "\\\\", multiline: true }),
        keyword(["if", "else", "while"]),
        keyword(["true", "false"], {}, TOKENS.boolean),
        match(["_", "$", LETTER], TOKENS.identifier),
        match(DIGIT, TOKENS.number),
        match(["+", "-", "*", "/"], TOKENS.operator),
        on([" ", "\\t", "\\n", "\\r"]),
      ],
    },
  },
});`;
	const skeleton = ts(skeleton_src);

	const shape_src = `interface GrammarState {
  rules?: GrammarRule[];
  mode?: "probe" | "tokenise";
  fallback?: string;   // probe states only: target if probing hits EOF
}

interface GrammarRule {
  // matchers — at most one
  match?: string | string[] | CharacterClassSymbol;
  range?: [string, string] | [string, string][];
  match_within?: { start: string; end: string; escape?: string; multiline?: boolean };
  any?: boolean;
  // modifiers and actions
  boundary?: boolean;
  token?: string;
  state?: string;
  exit?: boolean;
  seal?: boolean;
}`;
	const shape = ts(shape_src);

	const factories_src = `match("const", TOKENS.keyword);
// { token: "keyword", match: "const" }

match(["_", "$", LETTER], TOKENS.identifier);
// { token: "identifier", match: ["_", "$"], range: [["a","z"], ["A","Z"]] }

match("/", TOKENS.regex, enter("regex_pattern"));
// { state: "regex_pattern", token: "regex", match: "/" }

on(["_", "$", LETTER], goto("identifier_probe"));  // no token emitted
on([" ", "\\t", "\\n", "\\r"]);                      // consume, stay put

keyword(["return"], goto("regex_allow"));          // word-boundary checked

within('"', '"', TOKENS.string, { escape: "\\\\" });

fallback();                     // consume and stay
fallback(leave());              // pop the state
fallback(goto("division"));     // sideways — does NOT consume`;
	const factories = ts(factories_src);

	const sharing_src = `const common = [
  within("//", "\\n", TOKENS.comment),
  within("/*", "*/", TOKENS.comment),
  on([" ", "\\t", "\\n", "\\r"]),
];

// parameterise with a plain function when the destination varies
const operators = (after) => match(OP_ALL, TOKENS.operator, to(after));

states: {
  main:        { rules: [...common, operators("regex_allow")] },
  regex_allow: { rules: [...common, operators(null)] },
}`;
	const sharing = ts(sharing_src);

	const probe_src = `identifier_probe: {
  mode: "probe",
  fallback: "identifier",
  rules: [
    on("(", goto("function_name")),
    on([".", " ", ")", ";", "}", "{", "[", ","], goto("identifier")),
  ],
}`;
	const probe = ts(probe_src);

	const classes_src = `// range tags — plain data, mixable inside match(...) / on(...)
import { LOWER, UPPER, LETTER, DIGIT, ALNUM, HEX, range } from "@twinkleplop/core";

// symbol constants — passed as a bare \`match\` value
import { ASCII, SPACE, WORD, PUNCT, PRINT, CONTROL } from "@twinkleplop/core/compile";

range([["0", "7"]]);              // octal digits
range([["a", "z"], ["A", "Z"]]);  // letters`;
	const classes = ts(classes_src);

	const verify_src = `import { compile, verify } from "@twinkleplop/core/compile";

const issues = verify(raw_grammar);
const grammar = compile(raw_grammar);`;
	const verify = ts(verify_src);
</script>

<ArticleMain
	pane_path="docs / reference / grammar"
	title="grammars"
	subtitle="Writing a language definition against the DSL."
>
	<p>
		A grammar is a plain JavaScript module built from helper factories. Each
		helper returns a rule object, and the compiler does not care whether you
		called a helper or wrote the object by hand — the helpers just remove
		boilerplate and let you compose rules with ordinary JavaScript.
	</p>
	<CodeBlock fname="grammar.ts" html={skeleton} />
	<p>
		The <strong>first state declared</strong> is the initial state. Rules are
		tried top to bottom and the first match wins.
	</p>

	<Section id="shape" title="the grammar shape" num="§ 01">
		<CodeBlock fname="types.ts" html={shape} />
		<ParamTable
			headers={["field", "on", "meaning"]}
			rows={[
				[
					{ kind: "name", value: "mode" },
					{ kind: "type", value: "state" },
					{
						kind: "desc",
						value: `<code>"probe"</code> enters lookahead mode. Not a rule field.`,
					},
				],
				[
					{ kind: "name", value: "fallback" },
					{ kind: "type", value: "state" },
					{ kind: "desc", value: `Probe states only: where to go if probing hits EOF.` },
				],
				[
					{ kind: "name", value: "exit" },
					{ kind: "type", value: "rule" },
					{
						kind: "desc",
						value: `A boolean. There is no context-aware pop that names a parent state.`,
					},
				],
				[
					{ kind: "name", value: "boundary" },
					{ kind: "type", value: "rule" },
					{ kind: "desc", value: `Require a word boundary after the match.` },
				],
				[
					{ kind: "name", value: "seal" },
					{ kind: "type", value: "rule" },
					{
						kind: "desc",
						value: `Force a lexeme boundary even when the token type matches the previous one.`,
					},
				],
			]}
		/>
		<p>
			<code>seal</code> is set implicitly by the compiler for multi-char matches,
			structural transitions and boundary-checked rules, so you only need it
			explicitly for single-char matches that would otherwise coalesce.
		</p>
	</Section>

	<Section id="factories" title="rule factories" num="§ 02">
		<CodeBlock fname="factories.ts" html={factories} />
		<p>
			A single <code>match(...)</code> can emit both <code>match</code> and
			<code>range</code>, collapsing what would otherwise be two rules.
			A token-less <code>on(...)</code> rule <strong>does</strong> advance the
			pointer — the character is consumed silently.
		</p>
		<p>
			<code>any: true</code> combined with a sideways transition does
			<em>not</em> consume the character; it re-processes it in the destination
			state. That is how you hand a character back when you realise you are in
			the wrong context.
		</p>

		<SubSection id="transitions" title="transitions">
			<ParamTable
				headers={["helper", "stack op", "use when"]}
				rows={[
					[
						{ kind: "name", value: "enter(s)" },
						{ kind: "type", value: "push" },
						{ kind: "desc", value: `Entering a nested context you will return from.` },
					],
					[
						{ kind: "name", value: "goto(s)" },
						{ kind: "type", value: "replace" },
						{ kind: "desc", value: `Changing context without nesting.` },
					],
					[
						{ kind: "name", value: "leave()" },
						{ kind: "type", value: "pop" },
						{ kind: "desc", value: `Exiting a nested context. The character IS consumed.` },
					],
					[
						{ kind: "name", value: "to(s?)" },
						{ kind: "type", value: "optional" },
						{ kind: "desc", value: `Factories with a nullable destination — null means stay.` },
					],
				]}
			/>
		</SubSection>
	</Section>

	<Section id="sharing" title="sharing rules" num="§ 03">
		<p>
			Use plain arrays and spread. Because states are ordinary objects and
			helpers are ordinary functions, this is all you need — and it is the only
			supported mechanism.
		</p>
		<CodeBlock fname="sharing.ts" html={sharing} />
		<Callout mark="▸" variant="warn">
			There is no <code>rulesets</code> field, and no <code>include</code> or
			<code>extend</code> on a state. If you find those in an older document,
			they were never implemented — the compiler has no handling for them.
		</Callout>
	</Section>

	<Section id="classes" title="character classes" num="§ 04">
		<p>
			There are two unrelated sets of constants, and six names appear in both.
			Pick one import and stay with it.
		</p>
		<CodeBlock fname="classes.ts" html={classes} />
		<p>
			From <code>@twinkleplop/core</code> they are <code>RangeTag</code> objects
			you mix into a pattern array. From
			<code>@twinkleplop/core/compile</code> they are symbols you pass as
			<code>match</code> on their own.
		</p>
		<Callout mark="▸" variant="warn">
			<code>ANY</code> is exported from <code>@twinkleplop/core/compile</code>
			but the compiler has no branch for it — a rule using it silently matches
			nothing. Use <code>fallback()</code> instead.
		</Callout>
	</Section>

	<Section id="probe" title="probe states" num="§ 05">
		<p>
			Some tokens cannot be classified until you see what follows. CSS is the
			standard case: after entering a block,
			<code>a:hover one two three</code> could be a selector chain or a property
			and value until you reach <code>&#123;</code>, <code>;</code>,
			<code>&#125;</code> or EOF.
		</p>
		<p>
			A probe state scans ahead without committing. When it transitions to a
			non-probe state, the tokenizer rewinds to where the probe started — now
			with the correct target state. If it reaches EOF without matching, it goes
			to <code>fallback</code>.
		</p>
		<CodeBlock fname="probe.ts" html={probe} />
		<p>Inside a probe state, rules are positive-match only.</p>
	</Section>

	<Section id="ambiguity" title="disambiguation" num="§ 06">
		<ul>
			<li>
				<strong>Maximal munch</strong> is automatic. Patterns in a first-character
				bucket are sorted longest-first at compile time, so <code>/=</code> beats
				<code>/</code> regardless of the order you wrote them in.
			</li>
			<li><strong>Contextual ambiguity</strong> — use a probe state.</li>
			<li>
				<strong>Word boundaries</strong> — use <code>keyword(...)</code>, or set
				<code>boundary: true</code>, so <code>return</code> does not match inside
				<code>returning</code>.
			</li>
		</ul>
		<p>
			Whitespace gets no special treatment. If you want to skip it, add a rule
			that consumes it without emitting a token.
		</p>
	</Section>

	<Section id="verify" title="compiling and verifying" num="§ 07">
		<CodeBlock fname="verify.ts" html={verify} />
		<p>
			<code>compile()</code> warns about <code>exit: true</code> in the root
			state, where there is no parent to return to. When tokenization
			misbehaves, see <a href="/docs/tokenization">tokenization</a> for the
			debugging tools.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="grammars"
	sections={[
		{ href: "#shape", label: "§01 — the grammar shape", active: true },
		{ href: "#factories", label: "§02 — rule factories" },
		{ href: "#sharing", label: "§03 — sharing rules" },
		{ href: "#classes", label: "§04 — character classes" },
		{ href: "#probe", label: "§05 — probe states" },
		{ href: "#ambiguity", label: "§06 — disambiguation" },
		{ href: "#verify", label: "§07 — compiling and verifying" },
	]}
/>
