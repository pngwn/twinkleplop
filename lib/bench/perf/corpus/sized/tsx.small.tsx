// ---- unit 1 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 2 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}
