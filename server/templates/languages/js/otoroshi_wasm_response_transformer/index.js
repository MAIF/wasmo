export function execute() {
    let context = JSON.parse(Host.inputString())

    Host.outputString(JSON.stringify({
        ...context,
        status: 200,
        headers: {
            ...context.otoroshi_response.headers,
            OTOROSHI_WASM_PLUGIN_ID: "OTOROSHI_WASM_RESPONSE_TRANSFORMER",
            "Content-Type": "application/json"
        },
        body_json: {
            foo: "bar"
        },
        // cookies 
    }))

    return 0
}