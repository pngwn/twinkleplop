# ---- basic.py ----
x = 1
y = 2.5
name = "Ada"
greeting = 'hello'
active = True
empty = None


# ---- classes.py ----
from dataclasses import dataclass

@dataclass(frozen=True)
class Circle:
    """A circle with a radius."""
    radius: float = 1.0

    def area(self) -> float:
        return 3.14 * self.radius ** 2

    @classmethod
    def unit(cls) -> "Circle":
        return cls(radius=1.0)

    @staticmethod
    def pi() -> float:
        return 3.14159

class Generic[T]:
    items: list[T]

    def __init__(self, items: list[T]) -> None:
        self.items = items

type Vec[T] = list[T]
type Pair = tuple[int, str]


# ---- comments.py ----
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# A regular comment
x = 1  # inline comment
# another line
def foo():
    """A docstring, not a comment."""
    # comment in function
    return 42  # with trailing
# final comment


# ---- edge_cases.py ----
x = 1 + \
    2

a = (1
     + 2
     + 3)

b = ""
c = ''
d = """"""
e = ''''''
f = "she said \"hi\""

g = 1.5e+3
h = .5
i = 5.
j = 1e3j
k = 0.

m = lambda: 0
n = m()

o = a[1:5]
p = a[::2]
q = a[1:5:2]

r = {1: 2, 3: 4}
s = {1, 2, 3}
t = {x for x in range(10)}
u = {x: y for x, y in pairs}

class C:
    def __init__(self):
        self.value = 0
    def __repr__(self) -> str:
        return f"C({self.value!r})"

if x == 1 and y != 2:
    pass

result = a if b else c

print(*args, sep=", ")
fn(**kwargs)


# ---- fstrings.py ----
a = f"hello {name}"
b = f'value is {x}'
c = f"{x + y}"
d = F"upper {val}"
e = f"{x!r}"
f = f"{y!s}"
g = f"{z!a}"
h = f"{num:>10}"
i = f"{num:>{width}.{prec}f}"
j = f"{x=}"
k = f"{ x == y }"
l = f"{x := 5}"
m = rf"raw {val} path \n"
n = fR"RAW {val}"
o = f"{f'{inner}'}"
p = f"nested {f"{inner}"} string"
q = f"dict {d}"
r_ = f"call {func(a, b)}"
s = f"subscript {arr[0]}"
t = f"{{literal braces}}"
u = f"""triple
f-string {x}
with newlines"""
v = f"slice {arr[1:5]}"
w = f"{ {1, 2, 3} }"
x_ = f"{d['key']}"
y = f"mix {a} and {b} and {c:x<10}"


# ---- keywords.py ----
if True:
    pass
elif False:
    return None
else:
    break

for i in range(10):
    continue

while x > 0:
    x -= 1

try:
    import os
    from typing import List as L
    raise ValueError("bad")
except Exception as e:
    pass
finally:
    pass

def foo(a, b=1, *args, **kwargs):
    global x
    nonlocal y
    yield a
    yield from b

async def bar():
    await something()
    async for x in stream:
        pass
    async with ctx:
        pass

class Foo(Base):
    pass

x = lambda a: a + 1
assert x == 5
del x

with open("f") as f:
    pass

is_it = x is None
not_it = not x
in_it = y in [1, 2]
and_it = a and b
or_it = a or b


# ---- numbers.py ----
a = 0
b = 1
c = 42
d = 1_000_000
e = 0x1f
f = 0xDEAD_BEEF
g = 0b1010_0101
h = 0o755
i = 0
j = 000
k = 0_0_0
l = 1.0
m = 3.14
n = .5
o = 5.
p = 1.5e10
q = 1.5E-3
r = 1e3
s = 1.5_0e1_0
t = 10j
u = 3.14J
v = 1e3j
w = 1_000j


# ---- operators.py ----
a = 1 + 2
b = 3 - 4
c = 5 * 6
d = 7 / 8
e = 9 // 10
f = 11 % 12
g = 13 ** 14
h = 15 @ 16

a += 1
a -= 1
a *= 2
a /= 2
a //= 2
a %= 2
a **= 2
a @= m

a &= 1
a |= 1
a ^= 1
a <<= 1
a >>= 1

x = a & b | c ^ d
y = ~x
z = a << b >> c

eq = a == b
ne = a != b
lt = a < b
gt = a > b
le = a <= b
ge = a >= b

def f() -> int:
    return 42

result = (n := 10)

point.x
arr[0]
func(*args, **kwargs)

x = ...
Ellipsis = ...


# ---- patterns.py ----
match command:
    case "quit" | "q":
        pass
    case "help":
        show_help()
    case Point(x=0, y=0):
        origin()
    case Point(x=x, y=y) if x > 0:
        positive(x, y)
    case [1, 2, *rest]:
        pass
    case {"name": name, "age": age}:
        greet(name, age)
    case _:
        default()

match = 5
case = 10
type_var = int


# ---- strings.py ----
a = "hello"
b = 'world'
c = """triple double"""
d = '''triple single'''
e = "escape \"quoted\" chars"
f = 'she said \'hi\''
g = "newline\nhere"
h = "tab\there"
i = "unicode \u00e9 \N{SNAKE}"
j = "hex \x41 octal \101"
k = b"bytes"
l = B"BYTES"
m = r"raw \n not escaped"
n = R"raw R"
o = u"legacy"
p = U"LEGACY"
q = rb"raw bytes"
r_ = br"byte raw"
s = rB"case"
t = Br"case2"
u = """multi
line
string"""
v = r"""raw triple \n literal"""
w = "bad escape \q \z stays"
x = "" + ''
y = "concat" "enated"


# ---- unicode.py ----
π = 3.14159
λ = lambda x: x * 2
蛇 = "snake"
café = "coffee"
ř_1 = 1
naïve = True
