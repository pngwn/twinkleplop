import fs from "node:fs";
import path from "node:path";
import { tokenize as make_language } from "./dist/index.js";

const language = make_language();

const test_dir = path.join(import.meta.dirname, "test");
const files = fs.readdirSync(test_dir);

const input_files = files
  .filter((file) => file.endsWith(".yaml"))
  .map((file) => [file, fs.readFileSync(path.join(test_dir, file), "utf-8")]);

function get_tokens(input) {
  const result = language(input);
  const tokens = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const type = result.token_types[result.tokens[i * 3]];
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    const match = input.substring(start, end);
    tokens.push({ type, start, end, match });
  }
  return tokens;
}

const targets = process.argv.slice(2);

for (const [filename, content] of input_files) {
  const base_name = filename.replace(".yaml", "");
  if (targets.length > 0 && !targets.includes(base_name)) continue;
  const tokens = get_tokens(content);
  const output_path = path.join(test_dir, `${base_name}.output.js`);
  const output = `export const test = ${JSON.stringify(tokens, null, "\t")};\n`;
  fs.writeFileSync(output_path, output);
  console.log(`Generated ${base_name}.output.js (${tokens.length} tokens)`);
}
