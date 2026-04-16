package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }
