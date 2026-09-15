import type { RegistryEntry, RegistryValue } from "./types";

// aliases resolve once, at plugin setup, so a fence costs one map lookup and
// a broken registry fails the build before any document is read.
export function resolve_registry(
  languages: Record<string, RegistryValue>,
  default_language?: string,
): Map<string, RegistryEntry> {
  if (typeof languages !== "object" || languages === null || Array.isArray(languages)) {
    throw new TypeError("languages must be an object mapping a fence name to a highlighter");
  }

  const names = Object.keys(languages);
  const resolved = new Map<string, RegistryEntry>();

  for (const name of names) {
    resolved.set(name, entry_for(languages, name));
  }

  if (default_language !== undefined && !resolved.has(default_language)) {
    throw new Error(`default_language "${default_language}" is not in languages`);
  }

  return resolved;
}

function entry_for(languages: Record<string, RegistryValue>, name: string): RegistryEntry {
  const path = [name];
  let value = languages[name];

  while (typeof value === "string") {
    if (path.includes(value)) {
      throw new Error(`alias cycle in languages: ${[...path, value].join(" -> ")}`);
    }
    if (!(value in languages)) {
      throw new Error(
        `languages.${path[path.length - 1]} aliases "${value}", which is not in languages`,
      );
    }
    path.push(value);
    value = languages[value];
  }

  if (typeof value === "function") return { highlight: value };

  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RegistryEntry).highlight === "function"
  ) {
    const { highlight, twoslash } = value as RegistryEntry;
    if (twoslash !== undefined && typeof twoslash !== "function") {
      throw new TypeError(`languages.${name}.twoslash must be a function`);
    }
    return twoslash === undefined ? { highlight } : { highlight, twoslash };
  }

  throw new TypeError(
    `languages.${name} must be a highlight function, { highlight, twoslash }, or the name of another entry`,
  );
}
