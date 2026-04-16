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
