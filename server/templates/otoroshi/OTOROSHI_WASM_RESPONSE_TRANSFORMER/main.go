package main

import (
	"encoding/json"

	"github.com/buger/jsonparser"
	"github.com/extism/go-pdk"
	// "github.com/MAIF/otoroshi-go-types"
)

//export execute
func execute() int32 {
	input := pdk.Input()

	var headers, dataType, offset, err = jsonparser.Get(input, "request", "headers")

	_ = dataType
	_ = offset

	var outHeaders map[string]interface{}

	// Unmarshal the JSON data into the map
	err = json.Unmarshal(headers, &outHeaders)
	if err != nil {

	}

	outHeaders["Content-Type"] = "application/json"
	outHeaders["OTOROSHI_WASM_PLUGIN_ID"] = "OTOROSHI_WASM_RESPONSE_TRANSFORMER"

	if err != nil {
	}

	jsonHeaders, marshallingError := json.Marshal(outHeaders)
	if marshallingError != nil {

	}

	output := `{ 
		"status": 200,
		"headers": ` + string(jsonHeaders) + `, 
		"body_json": { "foo": "bar" } 
	}`

	mem := pdk.AllocateString(output)
	pdk.OutputMemory(mem)

	return 0
}

func main() {}
