// ---- unit 1 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 2 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
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


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
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


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
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


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}
