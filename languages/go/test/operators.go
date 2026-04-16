package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}
