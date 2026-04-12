// Character class constants for use in grammars
// These are special symbols that the compiler recognizes

import type { CharacterClassSymbol } from "./types";

// Match any character (including non-ASCII)
export const ANY: CharacterClassSymbol = Symbol("ANY");

// Match any ASCII character (0-127)
export const ASCII: CharacterClassSymbol = Symbol("ASCII");

// Match any digit (0-9)
export const DIGIT: CharacterClassSymbol = Symbol("DIGIT");

// Match any letter (a-z, A-Z)
export const LETTER: CharacterClassSymbol = Symbol("LETTER");

// Match any lowercase letter (a-z)
export const LOWER: CharacterClassSymbol = Symbol("LOWER");

// Match any uppercase letter (A-Z)
export const UPPER: CharacterClassSymbol = Symbol("UPPER");

// Match any alphanumeric character (a-z, A-Z, 0-9)
export const ALNUM: CharacterClassSymbol = Symbol("ALNUM");

// Match any whitespace character (space, tab, newline, carriage return)
export const SPACE: CharacterClassSymbol = Symbol("SPACE");

// Match any word character (a-z, A-Z, 0-9, _)
export const WORD: CharacterClassSymbol = Symbol("WORD");

// Match any hexadecimal digit (0-9, a-f, A-F)
export const HEX: CharacterClassSymbol = Symbol("HEX");

// Match any punctuation character (ASCII punctuation)
export const PUNCT: CharacterClassSymbol = Symbol("PUNCT");

// Match any printable ASCII character (32-126)
export const PRINT: CharacterClassSymbol = Symbol("PRINT");

// Match any control character (0-31, 127)
export const CONTROL: CharacterClassSymbol = Symbol("CONTROL");
