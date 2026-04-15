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
