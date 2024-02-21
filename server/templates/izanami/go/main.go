package main

import (
    "github.com/extism/go-pdk"
)

//export execute
func execute() int32 {
    mem := pdk.AllocateString(`{
      "active": true
    }`)
    pdk.OutputMemory(mem)

    return 0
}

func main() {}