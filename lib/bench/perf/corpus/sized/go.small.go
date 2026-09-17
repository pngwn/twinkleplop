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
