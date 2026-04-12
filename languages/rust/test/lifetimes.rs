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
