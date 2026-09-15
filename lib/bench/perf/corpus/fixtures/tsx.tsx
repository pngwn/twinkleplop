// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};
