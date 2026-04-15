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
