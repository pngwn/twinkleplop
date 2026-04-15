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
