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
