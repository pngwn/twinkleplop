// ---- unit 1 ----
// decorators + generics demo.
import { fetchUser } from "./api";

@sealed
class UserStore<T extends { id: number }> {
  private items: Map<number, T> = new Map();
  public readonly name = "users";
  public readonly active: boolean = true;

  add(item: T): this { this.items.set(item.id, item); return this; }
  get(id: number): T | undefined { return this.items.get(id); }
}

interface User { id: number; name: string; active?: boolean; }

const store = new UserStore<User>();
const re = /^[a-z]+$/i;
const query = `id=${1}`;
const markup = html`<section class="root" data-id="1">hi</section>`;

async function run() {
  const user = await fetchUser(1) as User satisfies User;
  if (re.test(user.name)) store.add(user);
}

function sealed(ctor: Function) { Object.seal(ctor); }
