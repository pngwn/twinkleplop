// ---- attributes.rs ----
#[derive(Debug, Clone)]
#[allow(dead_code)]
#[cfg(test)]
#[test]
#[inline(always)]
#[repr(C)]
#![feature(test)]
#![allow(unused)]


// ---- basics.rs ----
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


// ---- chars.rs ----
'a'
'Z'
' '
'\n'
'\t'
'\r'
'\\'
'\0'
'\''
'\"'
'\x41'
'\u{1F600}'


// ---- comments.rs ----
// single line comment
/// doc comment
//! inner doc comment

/* block comment */
/* multi
   line
   block */

/* /* nested */ block */
/* /* /* deeply */ nested */ comment */


// ---- complex.rs ----
use std::collections::HashMap;
use std::io::{self, Read};

#[derive(Debug)]
pub struct Config<'a> {
    name: &'a str,
    values: HashMap<String, Vec<i32>>,
}

impl<'a> Config<'a> {
    pub fn new(name: &'a str) -> Self {
        Config {
            name,
            values: HashMap::new(),
        }
    }

    pub async fn load(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let data = r#"{"key": "value"}"#;
        let count = 0xFF_FFu32;
        let flag = true;
        let ch = '\n';

        // process data
        for (key, value) in &self.values {
            if *value > &vec![0i32] {
                println!("{}: {:?}", key, value);
            }
        }

        /* nested /* comment */ here */

        Ok(())
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = config::new("test");
    let range = 0..=100;
    let shifted = 1 << 4;
    let _ = config.load();
    Ok(())
}


// ---- keywords.rs ----
fn let const static struct enum trait impl type mod use extern crate
pub mut ref move async await unsafe dyn
as in where self super Self
if else match loop while for break continue return
abstract become box do final macro override priv try typeof unsized virtual yield
true false


// ---- lifetimes.rs ----
fn foo<'a>(x: &'a str) -> &'a str {
    x
}

fn bar<'a, 'b>(x: &'a str, y: &'b str) -> &'a str {
    x
}

struct Ref<'a> {
    data: &'a i32,
}

fn with_static(x: &'static str) {}


// ---- numbers.rs ----
0
123
1_000_000
0xff
0xFF
0xFF_FF
0o77
0o77_77
0b1010
0b1010_1010

1.0
3.14
1_000.5
1.0e10
1.0E10
1.0e+10
1.0e-10

42i32
42u64
42usize
0xFFu8
0o77i16
0b1010u32
1.0f32
3.14f64


// ---- operators.rs ----
x + y
x - y
x * y
x / y
x % y
x & y
x | y
x ^ y
!x
x << y
x >> y
x < y
x > y
x <= y
x >= y
x == y
x != y
x && y
x || y
x += y
x -= y
x *= y
x /= y
x %= y
x &= y
x |= y
x ^= y
x <<= y
x >>= y
x = y
0..10
0..=10
a.b
x -> y
x => y
x?


// ---- strings.rs ----
"hello world"
"escape: \n \t \r \\ \0 \" \'"
"hex: \x41"
"unicode: \u{1F600}"
"multi
line"

b"byte string"
b"byte \x41 escape"
c"c string"

r"raw string"
r#"raw with "quotes""#
r##"raw with #"hash"# inside"##
r###"raw with ##"double hash"## inside"###

br"raw byte"
br#"raw byte with "quotes""#

cr"raw c string"
cr#"raw c with "quotes""#
