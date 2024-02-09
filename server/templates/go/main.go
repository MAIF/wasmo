package main

import (
	"github.com/extism/go-pdk"
)

//export greet
func greet() int32 {
	input := pdk.Input()
	greeting := `Hello, ` + string(input) + `!`
	pdk.OutputString(greeting)
	return 0
}

func main() {}