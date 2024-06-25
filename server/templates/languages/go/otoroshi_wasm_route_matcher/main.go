package main

import (
	"strconv"

	"github.com/buger/jsonparser"
	"github.com/extism/go-pdk"
	// "github.com/MAIF/otoroshi-go-types"
)

//export execute
func execute() int32 {
	input := pdk.Input()

	var foo, err = jsonparser.GetString(input, "request", "headers", "foo")

	if err != nil {
	}

	output := `{ "result":  ` + strconv.FormatBool(foo == "bar") + `}`
	mem := pdk.AllocateString(output)
	pdk.OutputMemory(mem)

	return 0
}

func main() {}
