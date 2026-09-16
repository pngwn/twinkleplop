// ---- unit 1 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 2 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 3 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 4 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 5 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 6 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 7 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 8 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 9 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 10 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 11 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 12 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);


// ---- unit 13 ----
// collects user scores and renders them as html.
import { render } from "./lib.js";

const MAX = 100;
const users = [
  { name: "ada\tlovelace", score: 93, active: true }, // [!em]
  { name: "alan",          score: null, active: false },
];
// [!hl :10...13]
class Scoreboard {
  constructor(entries) { this.entries = entries; }
  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }
}

const re = /^[a-z]+$/i;
const format = (u) => `${u.name}: ${u.score ?? "-"}`; // [!em]
const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;
const markup = html`<!doctype html><ul class="scores" id="board">${users.map((u) => `<li>${format(u)}</li>`).join("")}</ul>`;

render(markup, styles);
