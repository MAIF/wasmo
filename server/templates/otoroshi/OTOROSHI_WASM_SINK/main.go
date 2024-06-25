package main

import (
	"github.com/buger/jsonparser"
	"github.com/extism/go-pdk"
	// "github.com/MAIF/otoroshi-go-types"
)

//export sink_matches
func sink_matches() int32 {
	output := `{ "result":  true }`
	mem := pdk.AllocateString(output)
	pdk.OutputMemory(mem)

	return 0
}

//export sink_handle
func sink_handle() int32 {
	input := pdk.Input()

	var path, err = jsonparser.GetString(input, "request", "path")

	if err != nil {
	}

	output := `{ 
		"status": 200,
		"headers": {
			"Content-Type": "application/json" 
		},
		"body_json": {
			"WASM_SINK_RESPONSE": "Unknown path and domain for ` + path + `"
		}
	}`
	mem := pdk.AllocateString(output)
	pdk.OutputMemory(mem)

	return 0
}

func main() {}
