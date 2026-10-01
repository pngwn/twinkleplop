import { describe, expect, it, test } from "vitest";
import { tokenize as tokenize_core } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar, language, tokenize } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "..", "test");
const outputs = import.meta.glob("../test/*.output.js", { eager: true }) as Record<
  string,
  { test: unknown }
>;

function tokens(input: string) {
  const result = tokenize_core(input, grammar);
  const out = [];
  for (let i = 0; i < result.tokens.length; i += 3) {
    const [type, start, end] = result.tokens.slice(i, i + 3);
    out.push({ type: result.token_types[type], start, end, match: input.slice(start, end) });
  }
  return out;
}

const of_type = (input: string, type: string) =>
  tokens(input)
    .filter((t) => t.type === type)
    .map((t) => t.match);
const keywords = (input: string) => of_type(input, "keyword");

describe("Dockerfile grammar", () => {
  test("verify", () => expect(verify(raw_grammar)).toEqual([]));

  for (const file of fs.readdirSync(test_dir).filter((file) => file.endsWith(".dockerfile"))) {
    it(`tokenizes ${file}`, () => {
      const input = fs.readFileSync(path.join(test_dir, file), "utf8");
      expect(tokens(input)).toEqual(
        outputs[`../test/${file.replace(".dockerfile", ".output.js")}`].test,
      );
    });
  }

  it("recognizes all instructions in upper, lower and mixed case", () => {
    const names =
      "ADD ARG CMD COPY ENTRYPOINT ENV EXPOSE FROM HEALTHCHECK LABEL MAINTAINER ONBUILD RUN SHELL STOPSIGNAL USER VOLUME WORKDIR".split(
        " ",
      );
    for (const name of names) {
      for (const word of [
        name,
        name.toLowerCase(),
        [...name].map((c, i) => (i % 2 ? c.toLowerCase() : c)).join(""),
      ]) {
        expect(keywords(`${word} value\n`)).toEqual([word]);
        expect(keywords(word)).toEqual([word]);
      }
    }
  });

  it("requires a full instruction word and a logical line start", () => {
    expect(keywords("RUNNING x\nRUN-script x\nCOPY.foo x\nxRUN x\nRUN echo FROM CMD\n")).toEqual([
      "RUN",
    ]);
    expect(keywords("RUN echo \\\n  FROM is an argument\nCOPY . /app\n")).toEqual(["RUN", "COPY"]);
  });

  it("restricts contextual keywords to their instruction positions", () => {
    const input =
      "FROM AS AS build\nFROM alpine:AS aS stage\nHEALTHCHECK --interval=5m CMD echo NONE\nONBUILD COPY . /app\nHEALTHCHECK NONE\nFROM base AS-more\n";
    expect(keywords(input)).toEqual([
      "FROM",
      "AS",
      "FROM",
      "aS",
      "HEALTHCHECK",
      "CMD",
      "ONBUILD",
      "COPY",
      "HEALTHCHECK",
      "NONE",
      "FROM",
    ]);
  });

  it("preserves paths, image tags, hashes and numeric-looking values", () => {
    const input =
      "FROM registry:5000/team/image:1.2@sha256:abc123\nCOPY source#part /file\nENV VERSION=1.2 FLAG=true NIL=null\n";
    expect(of_type(input, "string")).toContain("registry:5000/team/image:1.2@sha256:abc123");
    expect(of_type(input, "string")).toContain("source#part");
    expect(of_type(input, "number")).toEqual([]);
    expect(of_type(input, "comment")).toEqual([]);
    expect(of_type(input, "property")).toEqual(["VERSION", "FLAG", "NIL"]);
  });

  it("recognizes ports, ranges, protocol separators and numeric signals", () => {
    expect(of_type("EXPOSE 8080/tcp 8000-8010/udp\nSTOPSIGNAL 15", "number")).toEqual([
      "8080",
      "8000",
      "8010",
      "15",
    ]);
  });

  it("tracks nested default replacements and respects single quotes and escapes", () => {
    const input = "ENV A=\"${ROOT:-${HOME:-/tmp}}\" B='$HOME' C=\\$HOME\n";
    const vars = tokens(input).filter((t) => t.type === "variable");
    expect(vars.map((t) => t.match).join("")).toBe("${ROOT:-${HOME:-/tmp}}");
    expect(vars.every((t) => t.end <= input.indexOf(" B="))).toBe(true);
  });

  it("keeps exec-command dollars literal but expands JSON builder paths", () => {
    expect(of_type('RUN ["echo", "$HOME", "${PATH}"]\n', "variable")).toEqual([]);
    expect(of_type('COPY ["$HOME/file", "/data"]\n', "variable").join("")).toBe("$HOME");
    expect(of_type('RUN echo [ "$HOME" ]\n', "variable").join("")).toBe("$HOME");
  });

  it("keeps whitespace inside quoted assignment keys", () => {
    const input = `LABEL "name with spaces"="value" 'other key'='literal'\n`;
    expect(of_type(input, "property")).toEqual(['"name with spaces"', "'other key'"]);
    expect(of_type(input, "string")).toEqual(['"value"', "'literal'"]);
  });

  it("keeps closing braces inside quoted replacement operands", () => {
    const input = 'ENV X=${VALUE:-"a}b"} SUFFIX=ok\n';
    expect(of_type(input, "variable").join("")).toBe("${VALUE:-}");
    expect(of_type(input, "string")).toContain('"a}b"');
    expect(of_type(input, "property")).toEqual(["X", "SUFFIX"]);
  });

  it("does not treat the second of paired escapes as a continuation", () => {
    for (const escape of ["\\", "`"]) {
      const input = `# escape=${escape}\nENV X='literal${escape}${escape}\nFROM next\n`;
      expect(keywords(input)).toEqual(["ENV", "FROM"]);
    }
  });

  it("handles JSON escaped quotes and backslashes in both escape modes", () => {
    for (const header of ["", "# escape=`\n"]) {
      const input = header + 'RUN ["a\\"b", "C:\\\\path", "$HOME"]\nFROM alpine\n';
      expect(of_type(input, "punctuation")).toEqual(["[", ",", ",", "]"]);
      expect(of_type(input, "variable")).toEqual([]);
      expect(keywords(input)).toEqual(["RUN", "FROM"]);
    }
  });

  it("skips comment and empty continuation lines without resetting instruction context", () => {
    for (const eol of ["\n", "\r\n"]) {
      const input = [
        "HEALTHCHECK --interval=5m \\ \t",
        " # not continued \\",
        "",
        "  CMD echo inline#hash # argument",
        "FROM alpine",
      ].join(eol);
      expect(keywords(input)).toEqual(["HEALTHCHECK", "CMD", "FROM"]);
      expect(of_type(input, "comment").join("")).toBe("# not continued \\");
    }
  });

  it("does not continue a comment ending in the escape character", () => {
    expect(keywords("# comment \\\nFROM alpine\nRUN echo x\n")).toEqual(["FROM", "RUN"]);
  });

  it("uses the initial escape directive and ignores late directives", () => {
    const input =
      "# syntax=docker/dockerfile:1\n# EsCaPe = `\n\nCOPY file C:\\\nFROM base\nRUN echo `\n FROM continued\n# escape=\\\nRUN echo `\n COPY continued\nFROM end";
    expect(keywords(input)).toEqual(["COPY", "FROM", "RUN", "RUN", "FROM"]);
  });

  it("ends directive recognition at a blank line or ordinary comment", () => {
    for (const prefix of ["\n", "# ordinary comment\n", "# unknown=value\n", "FROM base\n"]) {
      expect(keywords(prefix + "# escape=`\nRUN echo `\nFROM next").slice(-2)).toEqual([
        "RUN",
        "FROM",
      ]);
    }
  });

  it("recovers unfinished nested constructs at the next physical instruction", () => {
    for (const line of [
      'RUN "unfinished',
      "ENV X=${A:-${B",
      'COPY ["unfinished',
      "ENV X='unfinished",
    ]) {
      expect(keywords(`${line}\nFROM scratch\n`)).toEqual([line.split(" ")[0], "FROM"]);
    }
  });

  it("handles a BOM, indented instructions and EOF without newline", () => {
    expect(keywords('\ufeff  # syntax=docker/dockerfile:1\n\tFROM alpine\n  CMD ["echo"]')).toEqual(
      ["FROM", "CMD"],
    );
  });

  it("leaves every argument and continuation frame balanced past 256 repetitions", () => {
    const unit =
      'FROM --platform=$ARCH alpine AS base\nENV A="${X:-${Y:-ok}}" B=\'raw\' C=some\\ path\nHEALTHCHECK --interval=5m \\\n # comment\n CMD echo "$A"\nRUN ["a\\"b", "$HOME"]\n';
    const input = unit.repeat(350) + "FROM scratch AS final\nCOPY --from=base /out /app\n";
    expect(keywords(input).slice(-3)).toEqual(["FROM", "AS", "COPY"]);
    expect(keywords(input).length).toBe(350 * 6 + 3);
    expect(of_type(input, "property").slice(-1)).toEqual(["--from"]);
  });

  it("renders through the public API without exposing raw placeholders", () => {
    const input = 'FROM alpine\nRUN echo "<safe>"\n';
    expect(tokenize()(input)).toEqual(tokenize_core(input, grammar));
    const html = language()(input);
    expect(html).toContain('class="tok keyword"');
    expect(html).toContain("&lt;safe&gt;");
    expect(html).not.toContain("raw_");
  });
});
