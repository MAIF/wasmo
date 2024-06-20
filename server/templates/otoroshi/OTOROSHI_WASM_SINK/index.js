export function sink_matches() {
    // const context = JSON.parse(Host.inputString())
    
    Host.outputString(JSON.stringify({
        result: true
    }))

    return 0
}

export function sink_handle() {
    const context = JSON.parse(Host.inputString())

    Host.outputString(JSON.stringify({
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body_json: {
            "WASM_SINK_RESPONSE": `Unknown path and domain for ${context.request.path}`
        }
    }))

    return 0
}