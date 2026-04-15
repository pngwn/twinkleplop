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
