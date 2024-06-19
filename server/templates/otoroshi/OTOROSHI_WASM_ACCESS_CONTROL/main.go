package main

import (
	"github.com/buger/jsonparser"
	"github.com/extism/go-pdk"
)

//export execute
func execute() int32 {
	input := pdk.Input()

	var foo, err = jsonparser.GetString(input, "request", "headers", "foo")

	if err != nil {
	}

	var output = ""

	if foo == "bar" {
		output = `{
        "result": true
      }`
	} else {
		output = `{
        "result": false,
        "error": {
          "message": "you're not authorized",
          "status": 401
        }
      }`
	}

	mem := pdk.AllocateString(output)
	pdk.OutputMemory(mem)

	return 0
}

func main() {}
