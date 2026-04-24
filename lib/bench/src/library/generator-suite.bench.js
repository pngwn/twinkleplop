import { bench, describe } from "vitest";

// ============================================================================
// HTML Generation and String Building Suite
// Benchmarks for HTML escaping and string building strategies
// ============================================================================

// Test strings with varying escape needs
const no_escape_small = "Hello world this is a simple test string with no special characters";
const few_escape_small = "This has <some> HTML & a few \"special\" chars that need 'escaping'";
const many_escape_small = "<div class=\"test\" data-value='test&value'>Content & more</div>";

const mixed_content = `
function test() {
	const html = "<div class='container'>";
	const data = { name: "Test & Co.", value: "Some <value>" };
	return html + "</div>";
}`.trim();

// ============================================================================
// HTML Escaping Strategies
// ============================================================================

// Character scanning with lookup table
function escape_html_lookup(text) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    switch (char) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&#39;";
        break;
      default:
        result += char;
    }
  }
  return result;
}

// CharCode lookup (optimized)
function escape_html_char_code(text) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 38)
      result += "&amp;"; // &
    else if (code === 60)
      result += "&lt;"; // <
    else if (code === 62)
      result += "&gt;"; // >
    else if (code === 34)
      result += "&quot;"; // "
    else if (code === 39)
      result += "&#39;"; // '
    else result += text[i];
  }
  return result;
}

// Regex replace
function escape_html_regex(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Array join (check-first optimization)
function escape_html_array(text) {
  if (!/[&<>"']/.test(text)) return text;

  const parts = [];
  let last = 0;

  for (let i = 0; i < text.length; i++) {
    let escape;
    const char = text[i];

    if (char === "&") escape = "&amp;";
    else if (char === "<") escape = "&lt;";
    else if (char === ">") escape = "&gt;";
    else if (char === '"') escape = "&quot;";
    else if (char === "'") escape = "&#39;";
    else continue;

    if (i > last) parts.push(text.slice(last, i));
    parts.push(escape);
    last = i + 1;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.join("");
}

describe("HTML Escape - No special characters", () => {
  bench("CharCode lookup", () => {
    escape_html_char_code(no_escape_small);
  });

  bench("Switch lookup", () => {
    escape_html_lookup(no_escape_small);
  });

  bench("Regex replace", () => {
    escape_html_regex(no_escape_small);
  });

  bench("Array join (check-first)", () => {
    escape_html_array(no_escape_small);
  });
});

describe("HTML Escape - Few special characters", () => {
  bench("CharCode lookup", () => {
    escape_html_char_code(few_escape_small);
  });

  bench("Switch lookup", () => {
    escape_html_lookup(few_escape_small);
  });

  bench("Regex replace", () => {
    escape_html_regex(few_escape_small);
  });

  bench("Array join (check-first)", () => {
    escape_html_array(few_escape_small);
  });
});

describe("HTML Escape - Many special characters", () => {
  bench("CharCode lookup", () => {
    escape_html_char_code(many_escape_small);
  });

  bench("Switch lookup", () => {
    escape_html_lookup(many_escape_small);
  });

  bench("Regex replace", () => {
    escape_html_regex(many_escape_small);
  });

  bench("Array join (check-first)", () => {
    escape_html_array(many_escape_small);
  });
});

// ============================================================================
// String Building Strategies
// ============================================================================

// Generate mock tokens
function generate_tokens(count) {
  const tokens = new Uint32Array(count * 3);
  const token_types = ["keyword", "string", "comment", "number", "identifier", "operator"];
  const type_map = new Array(token_types.length);

  for (let i = 0; i < token_types.length; i++) {
    type_map[i] = token_types[i];
  }

  let pos = 0;
  for (let i = 0; i < count; i++) {
    const token_length = Math.floor(Math.random() * 20) + 1;
    tokens[i * 3] = i % token_types.length; // token type index
    tokens[i * 3 + 1] = pos; // start
    tokens[i * 3 + 2] = pos + token_length; // end
    pos += token_length + Math.floor(Math.random() * 3); // add some gaps
  }

  return { tokens, token_types: type_map, total_length: pos };
}

// Generate test input
function generate_input(length) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \n\t";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const small_token_data = generate_tokens(100);
const small_input = generate_input(small_token_data.total_length);

const medium_token_data = generate_tokens(1000);
const medium_input = generate_input(medium_token_data.total_length);

// String concatenation
function build_with_concat(input, tokens, token_types) {
  let result = "";
  let last_end = 0;

  for (let i = 0; i < tokens.length / 3; i++) {
    const type = tokens[i * 3];
    const start = tokens[i * 3 + 1];
    const end = tokens[i * 3 + 2];

    // Add any text before this token
    if (start > last_end) {
      result += input.slice(last_end, start);
    }

    // Add the token with wrapping
    result += `<span class="${token_types[type]}">`;
    result += input.slice(start, end);
    result += "</span>";

    last_end = end;
  }

  // Add any remaining text
  if (last_end < input.length) {
    result += input.slice(last_end);
  }

  return result;
}

// Array join
function build_with_array(input, tokens, token_types) {
  const parts = [];
  let last_end = 0;

  for (let i = 0; i < tokens.length / 3; i++) {
    const type = tokens[i * 3];
    const start = tokens[i * 3 + 1];
    const end = tokens[i * 3 + 2];

    // Add any text before this token
    if (start > last_end) {
      parts.push(input.slice(last_end, start));
    }

    // Add the token with wrapping
    parts.push(`<span class="${token_types[type]}">`);
    parts.push(input.slice(start, end));
    parts.push("</span>");

    last_end = end;
  }

  // Add any remaining text
  if (last_end < input.length) {
    parts.push(input.slice(last_end));
  }

  return parts.join("");
}

// Pre-sized array
function build_with_presized_array(input, tokens, token_types) {
  // Estimate size: each token adds 3 parts, plus gaps
  const estimated_parts = (tokens.length / 3) * 3 + 100;
  const parts = new Array(estimated_parts);
  let part_index = 0;
  let last_end = 0;

  for (let i = 0; i < tokens.length / 3; i++) {
    const type = tokens[i * 3];
    const start = tokens[i * 3 + 1];
    const end = tokens[i * 3 + 2];

    // Add any text before this token
    if (start > last_end) {
      parts[part_index++] = input.slice(last_end, start);
    }

    // Add the token with wrapping
    parts[part_index++] = `<span class="${token_types[type]}">`;
    parts[part_index++] = input.slice(start, end);
    parts[part_index++] = "</span>";

    last_end = end;
  }

  // Add any remaining text
  if (last_end < input.length) {
    parts[part_index++] = input.slice(last_end);
  }

  // Trim array to actual size and join
  parts.length = part_index;
  return parts.join("");
}

describe("String Building - Small (100 tokens)", () => {
  bench("String concatenation", () => {
    build_with_concat(small_input, small_token_data.tokens, small_token_data.token_types);
  });

  bench("Array join", () => {
    build_with_array(small_input, small_token_data.tokens, small_token_data.token_types);
  });

  bench("Pre-sized array", () => {
    build_with_presized_array(small_input, small_token_data.tokens, small_token_data.token_types);
  });
});

describe("String Building - Medium (1000 tokens)", () => {
  bench("String concatenation", () => {
    build_with_concat(medium_input, medium_token_data.tokens, medium_token_data.token_types);
  });

  bench("Array join", () => {
    build_with_array(medium_input, medium_token_data.tokens, medium_token_data.token_types);
  });

  bench("Pre-sized array", () => {
    build_with_presized_array(
      medium_input,
      medium_token_data.tokens,
      medium_token_data.token_types,
    );
  });
});
