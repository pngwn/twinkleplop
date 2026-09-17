# ---- unit 1 ----
"""greeter module prints salutations."""
# a tiny demo that exercises most of the grammar.
from __future__ import annotations

ANSWER: int = 42
names: list[str] = ["ada\tlovelace", "alan"]
ACTIVE: bool = True


class Greeter:
    """Greets people by name."""

    def __init__(self, prefix: str = "Hello") -> None:
        self.prefix = prefix

    def greet(self, name: str) -> str:
        return f"{self.prefix}, {name:>12}!\n"


def main() -> None:
    g = Greeter()
    for n in names:
        msg = g.greet(n)
        print(msg, end="\n")
    assert len(names) == 2 and ACTIVE, "expected two active names"


if __name__ == "__main__":
    main()


# ---- unit 2 ----
"""greeter module prints salutations."""
# a tiny demo that exercises most of the grammar.
from __future__ import annotations

ANSWER: int = 42
names: list[str] = ["ada\tlovelace", "alan"]
ACTIVE: bool = True


class Greeter:
    """Greets people by name."""

    def __init__(self, prefix: str = "Hello") -> None:
        self.prefix = prefix

    def greet(self, name: str) -> str:
        return f"{self.prefix}, {name:>12}!\n"


def main() -> None:
    g = Greeter()
    for n in names:
        msg = g.greet(n)
        print(msg, end="\n")
    assert len(names) == 2 and ACTIVE, "expected two active names"


if __name__ == "__main__":
    main()
