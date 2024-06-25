import { WasmResponseTransformerContext, WasmTransformerResponse } from 'otoroshi-ts-types';

export declare var Host: any;

export function execute() {
    let context = JSON.parse(Host.inputString()) as WasmResponseTransformerContext;

    const error: WasmTransformerResponse = {
        ...context,
        status: 200,
        headers: {
            ...context.otoroshi_request.headers,
            OTOROSHI_WASM_PLUGIN_ID: "OTOROSHI_WASM_RESPONSE_TRANSFORMER",
            "Content-Type": "application/json"
        },
        body_json: {
            foo: "bar"
        }
    }
    Host.outputString(JSON.stringify(error));

    return 0
}