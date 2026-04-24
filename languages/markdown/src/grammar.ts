// markdown grammar — pragmatic commonmark 0.31.2 + gfm highlighter.
//
// composition model
// -----------------
// markdown is unusual among twinkleplop targets because inline constructs
// compose arbitrarily: emphasis containing code, links containing bold,
// bold containing italic containing strike, and so on. a flat token stream
// cannot carry the "what contexts are active here" information from the
// grammar alone.
//
// the grammar solves this by emitting distinct open/close marker tokens
// for every composing construct (bold, italic, strike, code, link-text,
// autolink). a downstream reclassifier (src/reclassifiers.ts) walks the
// stream tracking a stack of active styles and rewrites every token's
// type to the space-separated list of active classes. the renderer
// already splits class-list strings at whitespace, so `"bold italic"`
// produces `<span class="bold italic">` at zero runtime cost.
//
// the grammar therefore stays flat: just 5 simple emphasis body states
// and one body state each for code, link-text, autolink. the reclassifier
// handles composition uniformly at unbounded depth.
//
// scope:
//   - block constructs: atx headings, blockquote markers, fenced code blocks
//     (backtick and tilde), thematic breaks, bullet list markers (- * +),
//     indented code blocks (4-space), yaml front matter at document start
//   - inline constructs: code span (single-backtick only), emphasis / strong
//     via * and _, gfm strikethrough (~~), links `[text](url)`, images
//     `![alt](url)`, reference link shapes, angle-bracket autolinks,
//     html-style entity references, backslash escapes, hard line breaks
//   - gfm task list markers `[ ]` / `[x]` / `[X]` at the start of a list item
//
// known limitations (deliberate, per RESEARCH.md and the design plan):
//   - the commonmark algorithm is two-pass (block then inline). this grammar
//     is single-pass. emphasis rule 9/10 pathological cases, link reference
//     resolution, list tightness, and lazy blockquote continuation are all
//     parser-level concerns this grammar does not handle.
//   - reference link label resolution is NOT performed. `[text][label]` emits
//     link-shape tokens; the `[label]: url` definition emits link-definition
//     shape tokens; the two are not connected lexically.
//   - setext heading promotion (paragraph reclassified as heading by a
//     following === / --- underline) is not done. `---` alone is always
//     thematic break.
//   - emphasis flanking is NOT checked. `5*6*7` mis-tokenizes `6` as italic.
//     the intraword `_` rule is not enforced. `foo_bar_baz` mis-tokenizes.
//   - emphasis does not cross a `\n` (soft line break). unclosed emphasis
//     terminates at end of line rather than at end of paragraph.
//   - code span only recognises single backticks. multi-backtick runs like
//     ``` ``foo `bar` baz`` ``` fall back to normal inline parsing.
//   - angle-bracket raw html (`<div>`) is tokenized as autolink. no structural
//     distinction between `<http://x>` and `<div>`.
//   - leading-indent-1-3-space variants of block markers are not recognised
//     (`  - foo` is tokenized as a paragraph, not a list item).
//   - ordered list markers (`1.`, `1)`) are not recognised. treated as text.
//   - gfm tables are not specifically recognised. `|` appears as punctuation
//     inside paragraphs; no header/delimiter row promotion.
//   - html block types 1-7 are not recognised as blocks. `<div>...</div>`
//     at column 0 begins with an autolink-shaped opening.
//   - bom stripping, tab expansion, unicode flanking category checks are
//     all not performed.
//   - block-level context (heading, blockquote) is not carried in the
//     composition stack. a bold span inside a heading is tagged `"bold"`,
//     not `"heading bold"`. extending the reclassifier to pick up
//     heading-marker / blockquote-marker as style pushes is possible but
//     deferred.

import { DIGIT, LETTER, enter, fallback, goto, leave, match, on, within } from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// custom token names. these are the base types — the reclassifier
// rewrites most of these into compound class lists. names that start
// with `open-` or `close-` are recognised by the reclassifier as style
// markers (push/pop on the active-style stack).
// backslash-escapes of any ascii punctuation (31 characters per commonmark §6.1).
// encoded as 2-char patterns so match() can pick them up atomically.
const ESCAPE_CHARS = [
  "\\!",
  '\\"',
  "\\#",
  "\\$",
  "\\%",
  "\\&",
  "\\'",
  "\\(",
  "\\)",
  "\\*",
  "\\+",
  "\\,",
  "\\-",
  "\\.",
  "\\/",
  "\\:",
  "\\;",
  "\\<",
  "\\=",
  "\\>",
  "\\?",
  "\\@",
  "\\[",
  "\\\\",
  "\\]",
  "\\^",
  "\\_",
  "\\`",
  "\\{",
  "\\|",
  "\\}",
  "\\~",
];

const ESCAPE_RULE = match(ESCAPE_CHARS, TOKENS.escape);

// hard line break via `\<newline>`. must come before the escape rule so
// the `\` + `\n` pair wins over the literal escape patterns.
const HARD_BREAK_BACKSLASH = match("\\\n", TOKENS.hard_break, goto("block_start"));

// opener rules shared across every state that accepts arbitrary inline
// content (inline_content, heading_body, link_text, every emphasis body
// state). ordering matters within the array — longer patterns first.
//
// emphasis delimiters emit *-open markers that the reclassifier picks up;
// the body states close with matching *-close markers. the same delimiter
// string appears as both open and close, but they're in DIFFERENT rules
// and DIFFERENT states, so they can carry different types.
const LINK_OPENERS = [
  match("![", TOKENS.link_text_open, enter("link_text")),
  match("[", TOKENS.link_text_open, enter("link_text")),
  match("<", TOKENS.autolink_open, enter("autolink_body")),
  match("&", TOKENS.entity, enter("entity_body")),
  match("`", TOKENS.code_open, enter("code_body")),
];

const EMPH_OPENERS = [
  match("**", TOKENS.bold_open, enter("bold_star_body")),
  match("__", TOKENS.bold_open, enter("bold_under_body")),
  match("~~", TOKENS.strike_open, enter("strike_body")),
  match("*", TOKENS.italic_open, enter("italic_star_body")),
  match("_", TOKENS.italic_open, enter("italic_under_body")),
];

// rules shared by every emphasis / code / link body state.
const INLINE_SUB_RULES = [HARD_BREAK_BACKSLASH, ESCAPE_RULE];

export default define_grammar({
  name: "markdown",
  states: {
    // -------------------------------------------------------------------
    // main — document entry. runs exactly once at position 0.
    //
    // the only reason this state exists is to catch yaml front matter,
    // which is only valid at the very start of the document. after that
    // decision is made, we never return to main.
    // -------------------------------------------------------------------
    main: {
      rules: [
        match("---\n", TOKENS.front_matter_marker, goto("front_matter_body")),
        fallback(goto("block_start")),
      ],
    },

    // front_matter_body — yaml content between `---` markers at document
    // start. terminates on a line that is exactly `---` or `...`. since
    // we have no line-start lookahead outside probes, we match the
    // newline+marker pair atomically.
    front_matter_body: {
      rules: [
        match(["\n---\n", "\n...\n"], TOKENS.front_matter_marker, goto("block_start")),
        match(["\n---", "\n..."], TOKENS.front_matter_marker, goto("block_start")),
        fallback({ token: TOKENS.raw_front_matter }),
      ],
    },

    // -------------------------------------------------------------------
    // block_start — entered at the beginning of every line (including
    // blank lines). the state machine "resets" here between blocks.
    //
    // ordering matters. longer / more-specific block prefixes come first.
    // -------------------------------------------------------------------
    block_start: {
      rules: [
        // blank lines / line endings consumed without emitting.
        on(["\n", "\r"]),

        // indented code block: exactly 4 leading spaces (or tab).
        match(["    ", "\t"], TOKENS.code_block, enter("indented_code")),

        // fenced code blocks. backtick and tilde fences are separate
        // states so the close must match the open character.
        match(["``````", "`````", "````", "```"], TOKENS.code_fence, enter("fence_info_btick")),
        match(["~~~~~~", "~~~~~", "~~~~", "~~~"], TOKENS.code_fence, enter("fence_info_tilde")),

        // atx heading markers — 1 to 6 hashes followed by space/eol.
        match(
          ["######", "#####", "####", "###", "##", "#"],
          TOKENS.heading_marker,
          enter("heading_space"),
        ),

        // thematic break: ---, ***, ___. three or more chars.
        match(["---", "***", "___"], TOKENS.hr, enter("thematic_break_tail")),

        // blockquote marker. stays in block_start so `> > foo` dispatches
        // recursively: two markers, then the inner content is block-start
        // dispatched as a fresh line.
        match(">", TOKENS.blockquote_marker),

        // bullet list marker. `- `, `* `, `+ ` (marker + space).
        match(["- ", "* ", "+ "], TOKENS.list_marker, enter("list_body_probe")),

        // leading whitespace (1-3 spaces or a tab) — consume without
        // emitting so the block dispatch continues correctly for
        // indented lists and compositions like `> # heading`.
        on([" ", "\t"]),

        // fallback: anything else on this line is a paragraph.
        fallback(goto("inline_content")),
      ],
    },

    // heading_space — between the `#` prefix and the heading text.
    // commonmark requires a space (or eol) after the hashes; without
    // one, the line is a paragraph, not a heading.
    heading_space: {
      rules: [
        on("\n", goto("block_start")),
        on([" ", "\t"], goto("heading_body")),
        fallback(goto("inline_content")),
      ],
    },

    // heading_body — inline content inside an atx heading. ends at \n.
    // the reclassifier does NOT push heading onto the style stack, so
    // nested emphasis inside a heading is tagged just `"bold"` etc.,
    // not `"heading bold"`. the heading's own class comes from the
    // heading-marker token at the line start.
    heading_body: {
      rules: [
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        ...EMPH_OPENERS,
        fallback({ token: TOKENS.heading }),
      ],
    },

    // -------------------------------------------------------------------
    // inline_content — default paragraph state. ends at \n (soft break
    // terminates paragraph for tokenization purposes; multi-line
    // paragraphs re-enter inline_content via block_start + fallback).
    // -------------------------------------------------------------------
    inline_content: {
      rules: [
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        ...EMPH_OPENERS,
        // paragraph text is untokenized — the generator copies it verbatim.
        fallback({}),
      ],
    },

    // -------------------------------------------------------------------
    // emphasis body states. each closes on its own delimiter and otherwise
    // allows arbitrary inline content including other emphasis kinds.
    // the body fallback emits the construct's own class as a base type;
    // the reclassifier's stack will already contain that class from the
    // *-open marker, so the reclassifier dedups when building the
    // compound class list.
    //
    // all five bodies share the same rule shape. the only thing that
    // differs is the close delimiter pattern. sibling emphasis kinds
    // are allowed as openers because the reclassifier handles nested
    // composition without any state-machine work.
    // -------------------------------------------------------------------
    bold_star_body: {
      rules: [
        match("**", TOKENS.bold_close, leave()),
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        match("__", TOKENS.bold_open, enter("bold_under_body")),
        match("~~", TOKENS.strike_open, enter("strike_body")),
        match("*", TOKENS.italic_open, enter("italic_star_body")),
        match("_", TOKENS.italic_open, enter("italic_under_body")),
        fallback({ token: TOKENS.bold }),
      ],
    },

    bold_under_body: {
      rules: [
        match("__", TOKENS.bold_close, leave()),
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        match("**", TOKENS.bold_open, enter("bold_star_body")),
        match("~~", TOKENS.strike_open, enter("strike_body")),
        match("*", TOKENS.italic_open, enter("italic_star_body")),
        match("_", TOKENS.italic_open, enter("italic_under_body")),
        fallback({ token: TOKENS.bold }),
      ],
    },

    italic_star_body: {
      rules: [
        match("*", TOKENS.italic_close, leave()),
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        match("**", TOKENS.bold_open, enter("bold_star_body")),
        match("__", TOKENS.bold_open, enter("bold_under_body")),
        match("~~", TOKENS.strike_open, enter("strike_body")),
        match("_", TOKENS.italic_open, enter("italic_under_body")),
        fallback({ token: TOKENS.italic }),
      ],
    },

    italic_under_body: {
      rules: [
        match("_", TOKENS.italic_close, leave()),
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        match("**", TOKENS.bold_open, enter("bold_star_body")),
        match("__", TOKENS.bold_open, enter("bold_under_body")),
        match("~~", TOKENS.strike_open, enter("strike_body")),
        match("*", TOKENS.italic_open, enter("italic_star_body")),
        fallback({ token: TOKENS.italic }),
      ],
    },

    strike_body: {
      rules: [
        match("~~", TOKENS.strike_close, leave()),
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        ...LINK_OPENERS,
        match("**", TOKENS.bold_open, enter("bold_star_body")),
        match("__", TOKENS.bold_open, enter("bold_under_body")),
        match("*", TOKENS.italic_open, enter("italic_star_body")),
        match("_", TOKENS.italic_open, enter("italic_under_body")),
        fallback({ token: TOKENS.strike }),
      ],
    },

    // -------------------------------------------------------------------
    // code span body. single-backtick runs only. newline inside an
    // unclosed code span terminates the block (unlike commonmark, which
    // allows multi-line code spans); this keeps state machine simple.
    // -------------------------------------------------------------------
    code_body: {
      rules: [
        match("`", TOKENS.code_close, leave()),
        on("\n", goto("block_start")),
        fallback({ token: TOKENS.code }),
      ],
    },

    // -------------------------------------------------------------------
    // link / image body.
    //
    // `[text]` or `![alt]` both enter link_text. on `]`, we dispatch to
    // link_after_close, which peeks the next character:
    //   `(`  -> inline link, goto link_destination
    //   `[`  -> reference link, goto link_reference_label
    //   else -> shortcut reference (or plain `[text]`), back to parent
    // -------------------------------------------------------------------
    link_text: {
      rules: [
        match("]", TOKENS.link_text_close, goto("link_after_close")),
        on("\n", goto("block_start")),
        ...INLINE_SUB_RULES,
        match("<", TOKENS.autolink_open, enter("autolink_body")),
        match("&", TOKENS.entity, enter("entity_body")),
        match("`", TOKENS.code_open, enter("code_body")),
        ...EMPH_OPENERS,
        fallback({ token: TOKENS.link_text }),
      ],
    },

    link_after_close: {
      rules: [
        match("(", TOKENS.url_link, goto("link_destination")),
        match("[", TOKENS.url_link, goto("link_reference_label")),
        // no extra bracket — shortcut reference shape `[label]` or
        // plain `[text]` not followed by a link tail. re-process
        // the current char in inline_content (no-consume goto).
        fallback(goto("inline_content")),
      ],
    },

    link_destination: {
      rules: [
        // leave() instead of goto("inline_content") so we pop back to
        // whatever state was wrapping the link — could be inline_content
        // at the root, or an emphasis body state if the link was inside
        // `*...*` / `**...**` / etc. using goto would replace the
        // current frame and leak the intervening emphasis frames,
        // breaking the reclassifier's style stack.
        match(")", TOKENS.url_link, leave()),
        on("\n", goto("block_start")),
        within('"', '"', TOKENS.url_title, { escape: "\\", multiline: false }),
        within("'", "'", TOKENS.url_title, { escape: "\\", multiline: false }),
        fallback({ token: TOKENS.url }),
      ],
    },

    link_reference_label: {
      rules: [
        // leave() for the same reason as link_destination above.
        match("]", TOKENS.url_link, leave()),
        on("\n", goto("block_start")),
        fallback({ token: TOKENS.property }),
      ],
    },

    // -------------------------------------------------------------------
    // autolink — anything between `<` and `>` on a line. raw html in
    // angle brackets gets the same treatment.
    // -------------------------------------------------------------------
    autolink_body: {
      rules: [
        match(">", TOKENS.autolink_close, leave()),
        on("\n", goto("block_start")),
        fallback({ token: TOKENS.autolink }),
      ],
    },

    // entity_body — after `&`, scan ascii alnum / `#` / `x` until `;`.
    // any other character bails out to inline_content (no-consume).
    entity_body: {
      rules: [
        match(";", TOKENS.entity, leave()),
        match([LETTER, DIGIT, "#", "x"], TOKENS.entity),
        fallback(goto("inline_content")),
      ],
    },

    // -------------------------------------------------------------------
    // list body dispatch.
    //
    // after a `- `, `* `, or `+ ` marker, we might see a gfm task marker
    // (`[ ]`, `[x]`, `[X]`) or normal inline content.
    // -------------------------------------------------------------------
    list_body_probe: {
      rules: [
        match(["[ ] ", "[x] ", "[X] "], TOKENS.task_marker, goto("inline_content")),
        fallback(goto("inline_content")),
      ],
    },

    // indented_code — 4-space-indented code line. stays on its own line;
    // the next line re-enters block_start for fresh dispatch. the \n is
    // emitted as code-block so the token span is contiguous with the
    // previous line's content if another indented_code line follows
    // (same token type = coalesced).
    indented_code: {
      rules: [match("\n", TOKENS.code_block, leave()), fallback({ token: TOKENS.code_block })],
    },

    // thematic_break_tail — consumes any trailing `-` / `*` / `_` / space
    // characters on the same line, then returns to block_start.
    thematic_break_tail: {
      rules: [
        match("\n", TOKENS.hr, leave()),
        match(["-", "*", "_", " ", "\t"], TOKENS.hr),
        fallback(goto("inline_content")),
      ],
    },

    // -------------------------------------------------------------------
    // fenced code blocks.
    //
    // fence_info_*: the info string (language + metadata) on the open
    // line. terminates at \n, then we enter the body state.
    //
    // fence_body_*: raw code body. on \n, try to match the close fence
    // (fence_maybe_close_*). if it fails, go back to body.
    // -------------------------------------------------------------------
    fence_info_btick: {
      rules: [on("\n", goto("fence_body_btick")), fallback({ token: TOKENS.code_language })],
    },

    fence_body_btick: {
      rules: [
        match("\n", TOKENS.raw_code_block, goto("fence_maybe_close_btick")),
        fallback({ token: TOKENS.raw_code_block }),
      ],
    },

    fence_maybe_close_btick: {
      rules: [
        match(["``````", "`````", "````", "```"], TOKENS.code_fence, goto("fence_close_tail")),
        fallback(goto("fence_body_btick")),
      ],
    },

    fence_info_tilde: {
      rules: [on("\n", goto("fence_body_tilde")), fallback({ token: TOKENS.code_language })],
    },

    fence_body_tilde: {
      rules: [
        match("\n", TOKENS.raw_code_block, goto("fence_maybe_close_tilde")),
        fallback({ token: TOKENS.raw_code_block }),
      ],
    },

    fence_maybe_close_tilde: {
      rules: [
        match(["~~~~~~", "~~~~~", "~~~~", "~~~"], TOKENS.code_fence, goto("fence_close_tail")),
        fallback(goto("fence_body_tilde")),
      ],
    },

    fence_close_tail: {
      rules: [
        match("\n", TOKENS.code_fence, goto("block_start")),
        fallback({ token: TOKENS.code_fence }),
      ],
    },
  },
});
