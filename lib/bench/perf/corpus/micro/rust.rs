//! greeter crate prints salutations.
use std::collections::HashMap;

const MAX: u32 = 100;
const ACTIVE: bool = true;

#[derive(Debug, Clone)]
pub struct Greeter<'a> {
    name: &'a str,
    scores: HashMap<String, i32>,
}

impl<'a> Greeter<'a> {
    pub fn new(name: &'a str) -> Self {
        Self { name, scores: HashMap::new() }
    }

    pub fn greet(&self) -> String {
        format!("hello,\t{}!\n", self.name)
    }
}

fn main() {
    let g = Greeter::new("world");
    let msg = g.greet();
    let nums: Vec<i32> = (0..3).collect();
    if ACTIVE {
        println!("{} {:?}", msg, nums);
    }
}
