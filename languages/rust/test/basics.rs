fn main() {
    let x = 5;
    let mut y = 10;
    let z = x + y;
    println!("Result: {}", z);
}

struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    fn distance(&self) -> f64 {
        (self.x * self.x + self.y * self.y).sqrt()
    }
}

enum Option<T> {
    Some(T),
    None,
}

trait Display {
    fn fmt(&self) -> String;
}

pub mod utils {
    pub fn helper() {}
}
