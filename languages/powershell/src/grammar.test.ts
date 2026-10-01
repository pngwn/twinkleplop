import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, test } from "vitest";
import { verify } from "@twinkleplop/core/compile";
import { tokenize as base_tokenize } from "@twinkleplop/core";
import { grammar, tokenize, language, raw_grammar, reclassifiers } from "./index.js";

const highlight = tokenize();
function get_tokens(input: string) {
  const result = highlight(input);
  const output = [];
  for (let i = 0; i < result.tokens.length; i += 3) {
    const start = result.tokens[i + 1];
    const end = result.tokens[i + 2];
    output.push({
      type: result.token_types[result.tokens[i]],
      start,
      end,
      match: input.slice(start, end),
    });
  }
  return output;
}
const compact = (input: string) => get_tokens(input).map((t) => [t.type, t.match]);
function expect_span(input: string, text: string, type: string) {
  const start = input.indexOf(text);
  expect(start).toBeGreaterThanOrEqual(0);
  const tokens = get_tokens(input);
  for (let pos = start; pos < start + text.length; pos++) {
    expect(tokens.find((t) => t.start <= pos && pos < t.end)?.type, `${text} at ${pos}`).toBe(type);
  }
}
const test_dir = path.join(import.meta.dirname, "..", "test");
const snapshots = import.meta.glob("../test/*.output.js", { eager: true }) as Record<
  string,
  { test: unknown }
>;

describe("PowerShell grammar", () => {
  test("verify", () => expect(verify(raw_grammar)).toEqual([]));
  for (const file of fs.readdirSync(test_dir).filter((f) => f.endsWith(".ps1"))) {
    it(`tokenizes ${file}`, () => {
      const input = fs.readFileSync(path.join(test_dir, file), "utf8");
      expect(get_tokens(input)).toEqual(snapshots[`../test/${file.slice(0, -4)}.output.js`].test);
    });
  }
});

describe("lexical boundaries", () => {
  it("folds complete keywords and operators without splitting command names", () => {
    expect(compact("iF iffy if-config -nOt -notable $TRUE $trueish $null")).toEqual([
      ["keyword", "iF"],
      ["identifier", "iffy"],
      ["identifier", "if-config"],
      ["operator", "-nOt"],
      ["parameter", "-notable"],
      ["boolean", "$TRUE"],
      ["variable", "$trueish"],
      ["keyword", "$null"],
    ]);
  });
  it("keeps keyword-looking members as properties", () => {
    expect_span("$obj.if; $obj.return", "if", "property");
    expect_span("$obj.if; $obj.return", "return", "property");
  });
  it("promotes declared functions and filters", () => {
    expect_span("FuNcTiOn <# help #> Get-Report {}", "Get-Report", "function");
    expect_span("filter Read-Data {}", "Read-Data", "function");
  });
  it("recognizes Unicode names without swallowing Unicode punctuation", () => {
    expect(compact("$café—$総計")).toEqual([
      ["variable", "$café"],
      ["operator", "—"],
      ["variable", "$総計"],
    ]);
  });
  it("distinguishes scoped names, static access and single-character variables", () => {
    const input = "$env:PATH $script:x $type::Member $$tail $?tail $^tail";
    expect_span(input, "$type", "variable");
    expect_span(input, "::", "punctuation");
    expect(
      get_tokens(input)
        .filter((t) => t.type === "variable")
        .map((t) => t.match),
    ).toEqual(["$env:PATH", "$script:x", "$type", "$$", "$?", "$^"]);
  });
  it("does not treat embedded or escaped hashes as comments", () => {
    const input = "echo hello#world hello`#world # comment\r$next";
    expect(
      get_tokens(input)
        .filter((t) => t.type === "comment")
        .map((t) => t.match),
    ).toEqual(["# comment"]);
    expect_span(input, "$next", "variable");
  });
  it("ends a non-nesting block comment at its first closer", () => {
    expect_span("<# outer <# inner #> $tail", "$tail", "variable");
  });
  it("keeps types and attribute arguments separate from indices", () => {
    const input = "[List[int]] [Parameter(Mandatory=$true)] $a[0] $a[$i]";
    expect_span(input, "List", "type");
    expect_span(input, "int", "type");
    expect_span(input, "Parameter", "type");
    expect_span(input, "$true", "boolean");
    expect_span(input, "0", "number");
    expect_span(input, "$i", "variable");
  });
  it("stops native verbatim arguments at a pipe or physical newline", () => {
    const input = 'cmd --% $literal # quote" `\n$next | cmd --% raw | $tail';
    expect_span(input, '$literal # quote" `', "string");
    expect_span(input, "$next", "variable");
    expect_span(input, "$tail", "variable");
  });
});

describe("strings and interpolation", () => {
  it("returns through nested code to the outer string (research trace 1)", () => {
    const input =
      '$message = "State: $(if ($service.Running) { "${env:COMPUTERNAME}: up" })"; $tail';
    expect_span(input, "if", "keyword");
    expect_span(input, "Running", "property");
    expect_span(input, "${env:COMPUTERNAME}", "variable");
    expect_span(input, ": up", "string");
    expect_span(input, "$tail", "variable");
    expect(get_tokens(input).at(-2)?.match).toBe(";");
  });
  it("does not close interpolation at delimiters inside comments or strings", () => {
    const input = '"$(<# ) #> ("$($x) )")) tail"; $after';
    expect_span(input, "<# ) #>", "comment");
    expect_span(input, " tail", "string");
    expect_span(input, "$after", "variable");
  });
  it("treats braced interpolation as a name and plain member suffix as string", () => {
    const input = '"${name with spaces} ${escaped`}brace} $x.Name $($x.Name)"';
    expect_span(input, "${name with spaces}", "variable");
    expect_span(input, "${escaped`}brace}", "variable");
    expect_span(input, ".Name", "string");
    expect(
      get_tokens(input)
        .filter((t) => t.type === "property")
        .map((t) => t.match),
    ).toEqual(["Name"]);
  });
  it.each(["'don''t $x `n'", '"a ""b"" `$x"', "‘don’‘t $x’", "“a ”“b”” `$x”"])(
    "handles quoting: %s",
    (input) => {
      expect_span(input, input, "string");
    },
  );
  it("leaves bare dollars as literal string content", () => {
    expect_span('"cost $ and $!"', "cost $ and $!", "string");
  });
  it.each(["\n", "\r\n", "\r"])("requires here-string footer at column zero (%j)", (nl) => {
    const input =
      '$body = @" \t' + nl + 'literal "@ and' + nl + '  "@' + nl + "$($x.Count)" + nl + '"@; $tail';
    expect_span(input, 'literal "@ and' + nl + '  "@', "string");
    expect_span(input, "$x", "variable");
    expect_span(input, "Count", "property");
    expect_span(input, "$tail", "variable");
  });
  it("handles empty and verbatim here-strings", () => {
    expect_span('@"\n"@; $tail', "$tail", "variable");
    expect_span("@'\n$x $(Get-Date) `n\n'@", "@'\n$x $(Get-Date) `n\n'@", "string");
  });
  it("does not use an escaped newline to start a here-string footer", () => {
    const input = '@"\nx`\n"@ still body\n"@; $tail';
    expect_span(input, '"@ still body', "string");
    expect_span(input, "$tail", "variable");
  });
});

describe("numbers and operators", () => {
  it.each([
    ".5",
    "1.",
    "1.e+2",
    "1.2E-3",
    "0x1e2D",
    "0xffL",
    "0b101uy",
    "100us",
    "100ul",
    "482ngb",
    "1.30Dmb",
    "1e2KB",
  ])("keeps %s in one number", (literal) => {
    expect(compact(literal)).toEqual([["number", literal]]);
  });
  it("keeps ranges separate from decimal points", () => {
    expect(compact("1..10")).toEqual([
      ["number", "1"],
      ["operator", ".."],
      ["number", "10"],
    ]);
  });
  it.each([
    "??=",
    "??",
    "&&",
    "||",
    "++",
    "--",
    "+=",
    "*>>",
    "2>&1",
    "6>>",
    "-cnotcontains",
    "–EQ",
    "—ne",
  ])("recognizes %s as an operator", (operator) => {
    expect(compact(operator)).toEqual([["operator", operator]]);
  });
  it("matches the process-filter research trace", () => {
    const input =
      "Get-Process | Where-Object { $_.WorkingSet -GT 1.5GB -and $null -ne $_ } 2>&1 # report\n";
    expect_span(input, "1.5GB", "number");
    expect_span(input, "-GT", "operator");
    expect_span(input, "2>&1", "operator");
    expect_span(input, "# report", "comment");
  });
});

describe("robustness and public API", () => {
  it.each([
    "1.5e+2Dmb; ",
    "0x10Lgb; ",
    "0b10uy; ",
    '"$($x + (1))"; ',
    '@"\n$x\n"@; ',
    "@'\nx\n'@; ",
    "${escaped`}name}; ",
    "[List[int]]; ",
    "Get-Item -Path a; ",
    "<# hi #> ",
  ])("preserves the tail after 600 repetitions of %j", (unit) => {
    expect(compact(unit.repeat(600) + '"$($tail)"; $true').slice(-6)).toEqual([
      ["punctuation", "$("],
      ["variable", "$tail"],
      ["punctuation", ")"],
      ["string", '"'],
      ["punctuation", ";"],
      ["boolean", "$true"],
    ]);
  });
  it.each([
    '"unfinished $(',
    "'unfinished",
    "<# unfinished",
    "${unfinished",
    '@"\nunfinished',
    "(((((",
    "1e+",
    "-",
  ])("terminates on incomplete %j", (input) => {
    for (const token of get_tokens(input)) {
      expect(token.end).toBeGreaterThan(token.start);
      expect(token.end).toBeLessThanOrEqual(input.length);
    }
  });
  it("returns valid nonoverlapping token spans", () => {
    for (const file of fs.readdirSync(test_dir).filter((f) => f.endsWith(".ps1"))) {
      const input = fs.readFileSync(path.join(test_dir, file), "utf8");
      let end = 0;
      for (const token of get_tokens(input)) {
        expect(token.start).toBeGreaterThanOrEqual(end);
        expect(token.end).toBeGreaterThan(token.start);
        expect(token.end).toBeLessThanOrEqual(input.length);
        end = token.end;
      }
    }
  });
  it("does not mutate the base token stream during enrichment", () => {
    const input = "IF ($true -EQ $false) {}";
    const base = base_tokenize(input, grammar);
    const tokens = base.tokens.slice();
    const types = base.token_types.slice();
    reclassifiers[0].reclassifier(input, base);
    expect(base.tokens).toEqual(tokens);
    expect(base.token_types).toEqual(types);
  });
  it("renders escaped HTML", () => {
    const output = language()('$x = "<tag> &"');
    expect(output).toContain("&lt;tag&gt;");
    expect(output).toContain("&amp;");
  });
});
