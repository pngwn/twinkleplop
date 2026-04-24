// realistic code samples for the stripped-grammar benchmarks.
// sized to cover tiny/small/medium/large so we can see where the
// reclassifier/grammar cost crossover happens.

export const python_medium = `import asyncio
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Callable

@dataclass
class Request:
    method: str
    path: str
    headers: Dict[str, str] = field(default_factory=dict)
    body: Optional[bytes] = None

    def header(self, name: str) -> Optional[str]:
        return self.headers.get(name.lower())

class Router:
    def __init__(self) -> None:
        self.routes: List[tuple[str, str, Callable]] = []

    def get(self, path: str):
        def decorator(fn: Callable) -> Callable:
            self.routes.append(("GET", path, fn))
            return fn
        return decorator

    async def dispatch(self, req: Request) -> str:
        for method, path, fn in self.routes:
            if method == req.method and path == req.path:
                result = fn(req)
                if asyncio.iscoroutine(result):
                    result = await result
                return str(result)
        return "not found"

router = Router()

@router.get("/users/{id}")
async def show_user(req: Request) -> dict:
    user_id = int(req.path.split("/")[-1])
    return {"id": user_id, "name": f"User {user_id}", "active": True}

type UserId = int
type Handlers = List[Callable[[Request], Optional[str]]]

def apply_middleware(handlers: Handlers, req: Request) -> List[str]:
    results = []
    for handler in handlers:
        value = handler(req)
        if value is not None:
            results.append(value)
    return results

if __name__ == "__main__":
    asyncio.run(router.dispatch(Request("GET", "/users/42")))
`;

export const python_large = (() => {
  const blocks = [];
  for (let i = 0; i < 20; i++) {
    blocks.push(`
class Node${i}:
    def __init__(self, name: str, children: list = None) -> None:
        self.name = name
        self.children = children or []
        self.active = True

    def add_child(self, child: "Node${i}") -> None:
        self.children.append(child)

    def count(self) -> int:
        total = 1
        for c in self.children:
            total += c.count()
        return total

    def find(self, name: str) -> Optional["Node${i}"]:
        if self.name == name:
            return self
        for c in self.children:
            result = c.find(name)
            if result is not None:
                return result
        return None

def build_tree_${i}(items: list[dict]) -> Node${i}:
    root = Node${i}("root")
    for item in items:
        node = Node${i}(item["name"])
        root.add_child(node)
    return root
`);
  }
  return blocks.join("\n");
})();

export const rust_medium = `use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct Request {
    method: String,
    path: String,
    headers: HashMap<String, String>,
}

impl Request {
    pub fn new(method: &str, path: &str) -> Self {
        Self {
            method: method.to_string(),
            path: path.to_string(),
            headers: HashMap::new(),
        }
    }

    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers.get(&name.to_lowercase()).map(|s| s.as_str())
    }
}

pub type Handler = Arc<dyn Fn(&Request) -> String + Send + Sync>;

pub struct Router<'a> {
    routes: Vec<(&'a str, &'a str, Handler)>,
}

impl<'a> Router<'a> {
    pub fn new() -> Self {
        Self { routes: Vec::new() }
    }

    pub fn get(&mut self, path: &'a str, handler: Handler) {
        self.routes.push(("GET", path, handler));
    }

    pub fn dispatch(&self, req: &Request) -> Option<String> {
        for (method, path, handler) in &self.routes {
            if *method == req.method && *path == req.path {
                return Some(handler(req));
            }
        }
        None
    }
}

fn main() {
    let mut router = Router::new();
    router.get("/users/:id", Arc::new(|req: &Request| {
        let id = req.path.split('/').last().unwrap_or("0");
        format!("{{\\"id\\": {}}}", id)
    }));
    let req = Request::new("GET", "/users/42");
    if let Some(body) = router.dispatch(&req) {
        println!("body = {}", body);
    }
}
`;

export const rust_large = (() => {
  const blocks = [];
  for (let i = 0; i < 20; i++) {
    blocks.push(`
#[derive(Debug, Clone)]
pub struct Node${i} {
    pub name: String,
    pub children: Vec<Node${i}>,
    pub active: bool,
}

impl Node${i} {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            children: Vec::new(),
            active: true,
        }
    }

    pub fn add_child(&mut self, child: Node${i}) {
        self.children.push(child);
    }

    pub fn count(&self) -> usize {
        let mut total: usize = 1;
        for c in &self.children {
            total += c.count();
        }
        total
    }

    pub fn find<'a>(&'a self, name: &str) -> Option<&'a Node${i}> {
        if self.name == name {
            return Some(self);
        }
        for c in &self.children {
            if let Some(n) = c.find(name) {
                return Some(n);
            }
        }
        None
    }
}
`);
  }
  return blocks.join("\n");
})();

// reuse the JS samples from the library directory
export { small_js, medium_js, large_js, complex_js } from "../library/javascript-samples.js";
