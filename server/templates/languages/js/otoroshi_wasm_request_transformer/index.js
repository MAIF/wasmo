export function execute() {
    let context = JSON.parse(Host.inputString())

    Host.outputString(JSON.stringify({
        ...context,
        method: "POST",
        headers: {
            ...context.otoroshi_request.headers,
            OTOROSHI_WASM_PLUGIN_ID: "OTOROSHI_WASM_REQUEST_TRANSFORMER",
            "Content-Type": "application/json"
        },
        body_json: {
            foo: "bar"
        }
    }))

    return 0
}