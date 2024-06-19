package main

import (
    "github.com/extism/go-pdk"
    "github.com/buger/jsonparser"
    // "github.com/MAIF/otoroshi-go-types"
)

//export execute
func execute() int32 {
    input := pdk.Input() 

    var headers, dataType, offset, err = jsonparser.Get(input, "request", "headers")

    _ = dataType
    _ = offset
    _ = headers

    if err != nil {}

    output := `{ "headers": { "Content-Type": "text/html" }, "body": "<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body style=\"display: flex;align-items: center;justify-content: center;flex-direction: column;height: 100vh;font-family: monospace;\"><h1>This HTML comes from the Wasmo plugin</h1><img src=\"https://maif.github.io/wasmo/wasmo.png\" style=\"width: 200;\"></body></html>", "status": 200 }`
    mem := pdk.AllocateString(output)
    pdk.OutputMemory(mem)

    return 0
}

func main() {}