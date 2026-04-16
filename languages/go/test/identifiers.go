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
