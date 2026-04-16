package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}
