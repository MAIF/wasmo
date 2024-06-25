package main

import (
	"github.com/buger/jsonparser"
	"github.com/extism/go-pdk"
)

//export execute
func execute() int32 {
	input := pdk.Input()

	var bar, err = jsonparser.GetString(input, "request", "headers", "bar")

	if err != nil {
	}

	var output = ""

	if bar == "foo" {
		output = `{
        "error": false
      }`
	} else {
		output = `{
        "error": true,
        "headers": {
          "Content-Type": "text/plain"
        },
        "status": 401,
        "body": "you're not authorized"
      }`
	}

	mem := pdk.AllocateString(output)
	pdk.OutputMemory(mem)

	return 0
}

func main() {}
