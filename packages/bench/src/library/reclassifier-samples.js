// Fixtures exercising the reclassifier pipeline.
//
// These samples are shaped to stress-test specific pipeline stages:
//
//   - `taggedTemplatesJS` — many `` html`...` `` and `` css`...` `` calls
//     with attribute-position interpolations (the Phase 3.5 exemplar).
//     Exercises embedInterleaved, nested brace tracking in the JS grammar,
//     and HTML/CSS sub-tokenization.
//
//   - `embeddedHTML` — a realistic HTML document with <style> and <script>
//     blocks containing function declarations and class definitions.
//     Exercises HTML's embedGrammars mapping plus JS's own reclassifiers
//     applied inside the sub-tokenized <script> body.
//
//   - `plainJS` — a medium-sized JS sample with NO template literals.
//     Lets us measure the reclassifier's scan-and-no-match cost
//     (how much does `embedInterleaved` cost when it never fires?).

// ---------------------------------------------------------------------------
// taggedTemplatesJS — lit-html style component with many interpolated tags
// ---------------------------------------------------------------------------

export const taggedTemplatesJS = `// Lit-html style component with attribute- and content-position
// interpolations. Every tagged template here exercises embedInterleaved
// including the exemplar attribute-position case from Phase 3.5.

const theme = css\`
  :root {
    --primary: #0070f3;
    --bg: #0a0a0a;
    --fg: #ededed;
  }
  body {
    background: var(--bg);
    color: var(--fg);
    margin: 0;
    font-family: system-ui, sans-serif;
  }
\`;

const buttonStyles = (variant) => css\`
  .btn {
    background: var(--primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  .btn--\${variant} {
    opacity: 0.9;
  }
\`;

export const Card = ({ title, body, href, variant }) => html\`
  <div class="card card--\${variant}">
    <h2 class="card__title">\${title}</h2>
    <p class="card__body">\${body}</p>
    <a class="card__link" href="\${href}" target="_blank">Read more</a>
  </div>
\`;

export const List = ({ items, onSelect }) => html\`
  <ul class="list" role="listbox">
    \${items.map((item, i) => html\`
      <li
        class="list__item"
        data-index="\${i}"
        data-id="\${item.id}"
        aria-selected="\${item.selected ? 'true' : 'false'}"
        @click="\${() => onSelect(item)}"
      >
        <span class="list__label">\${item.label}</span>
        <span class="list__meta">\${item.meta}</span>
      </li>
    \`)}
  </ul>
\`;

export const Modal = ({ open, title, children, onClose }) => html\`
  <div class="modal" ?hidden="\${!open}" role="dialog" aria-modal="true">
    <div class="modal__backdrop" @click="\${onClose}"></div>
    <div class="modal__panel">
      <header class="modal__header">
        <h1>\${title}</h1>
        <button
          class="modal__close"
          type="button"
          aria-label="Close"
          @click="\${onClose}"
        >×</button>
      </header>
      <div class="modal__body">\${children}</div>
    </div>
  </div>
\`;

export const Form = ({ fields, onSubmit }) => html\`
  <form class="form" @submit="\${onSubmit}">
    \${fields.map(field => html\`
      <label class="field">
        <span class="field__label">\${field.label}</span>
        <input
          class="field__input"
          type="\${field.type}"
          name="\${field.name}"
          value="\${field.value}"
          placeholder="\${field.placeholder}"
          required="\${field.required}"
        />
      </label>
    \`)}
    <button type="submit" class="btn btn--primary">Submit</button>
  </form>
\`;

export const Layout = ({ children, nav }) => html\`
  <div class="layout">
    <aside class="layout__nav">
      <nav>
        \${nav.map(item => html\`
          <a href="\${item.href}" class="nav__item nav__item--\${item.active ? 'active' : 'inactive'}">
            \${item.label}
          </a>
        \`)}
      </nav>
    </aside>
    <main class="layout__main">
      \${children}
    </main>
  </div>
\`;

const globalStyles = css\`
  .layout { display: grid; grid-template-columns: 240px 1fr; }
  .layout__nav { background: #111; padding: 1rem; }
  .layout__main { padding: 2rem; overflow: auto; }
  .nav__item { display: block; padding: 0.5rem; color: var(--fg); text-decoration: none; }
  .nav__item--active { background: var(--primary); }
\`;
`;

// ---------------------------------------------------------------------------
// embeddedHTML — realistic HTML with substantial <style> and <script>
// ---------------------------------------------------------------------------

export const embeddedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Embedded demo</title>
  <style>
    :root {
      --primary: #0070f3;
      --bg: #0a0a0a;
      --fg: #ededed;
      --border: #333;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, -apple-system, sans-serif;
    }

    .container {
      max-width: 72rem;
      margin: 0 auto;
      padding: 1rem;
    }

    .card {
      background: #111;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .card__title {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      color: var(--primary);
    }

    .card__body {
      margin: 0;
      color: #aaa;
      line-height: 1.5;
    }

    .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn:hover {
      filter: brightness(1.1);
    }

    @media (max-width: 640px) {
      .container { padding: 0.5rem; }
      .card { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="heading">Hello, world</h1>
    <div class="card">
      <h2 class="card__title">Welcome</h2>
      <p class="card__body">This is a demonstration of embedded languages.</p>
      <button id="hi" class="btn">Click me</button>
    </div>
  </div>
  <script>
    const el = document.getElementById("hi");
    const greet = name => \`Hello, \${name}!\`;

    class Counter {
      constructor(initial = 0) {
        this.value = initial;
        this.listeners = [];
      }

      increment() {
        this.value += 1;
        this.notify();
      }

      decrement() {
        this.value -= 1;
        this.notify();
      }

      subscribe(fn) {
        this.listeners.push(fn);
        return () => {
          const i = this.listeners.indexOf(fn);
          if (i > -1) this.listeners.splice(i, 1);
        };
      }

      notify() {
        for (const fn of this.listeners) {
          fn(this.value);
        }
      }
    }

    const counter = new Counter();
    const onClick = async () => {
      counter.increment();
      el.textContent = greet("world " + counter.value);
      await new Promise(r => setTimeout(r, 300));
    };

    el.addEventListener("click", onClick);
  </script>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// plainJS — medium JS with NO templates at all
// ---------------------------------------------------------------------------
//
// Used to measure the reclassifier's "no-op" overhead: how much does running
// the full language pipeline cost when none of the transforms actually fire?

export const plainJS = `// Classic data-structure implementation — no template literals anywhere.
// Lets us measure the "scan and find nothing" cost of the reclassifier.

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  push(value) {
    const node = { value, next: null };
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }
    this.tail = node;
    this.length += 1;
    return this;
  }

  pop() {
    if (!this.head) return undefined;
    if (this.head === this.tail) {
      const value = this.head.value;
      this.head = null;
      this.tail = null;
      this.length = 0;
      return value;
    }
    let current = this.head;
    while (current.next !== this.tail) {
      current = current.next;
    }
    const value = this.tail.value;
    this.tail = current;
    this.tail.next = null;
    this.length -= 1;
    return value;
  }

  shift() {
    if (!this.head) return undefined;
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this.length -= 1;
    return value;
  }

  unshift(value) {
    const node = { value, next: this.head };
    this.head = node;
    if (!this.tail) this.tail = node;
    this.length += 1;
    return this;
  }

  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }

  map(fn) {
    const result = new LinkedList();
    let current = this.head;
    while (current) {
      result.push(fn(current.value));
      current = current.next;
    }
    return result;
  }

  filter(fn) {
    const result = new LinkedList();
    let current = this.head;
    while (current) {
      if (fn(current.value)) {
        result.push(current.value);
      }
      current = current.next;
    }
    return result;
  }

  reduce(fn, initial) {
    let acc = initial;
    let current = this.head;
    while (current) {
      acc = fn(acc, current.value);
      current = current.next;
    }
    return acc;
  }
}

function quicksort(arr, lo = 0, hi = arr.length - 1) {
  if (lo < hi) {
    const p = partition(arr, lo, hi);
    quicksort(arr, lo, p - 1);
    quicksort(arr, p + 1, hi);
  }
  return arr;
}

function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (arr[j] <= pivot) {
      i += 1;
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
  const tmp = arr[i + 1];
  arr[i + 1] = arr[hi];
  arr[hi] = tmp;
  return i + 1;
}

function binarySearch(sorted, target) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return -1;
}

export { LinkedList, quicksort, binarySearch };
`;
