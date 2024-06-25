import { WasmPreRouteContext, WasmPreRouteResponse } from 'otoroshi-ts-types';

export declare var Host: any;

export function execute() {
    let context = JSON.parse(Host.inputString()) as WasmPreRouteContext;

    if (context.request.headers["bar"] === "foo") {
        const out: WasmPreRouteResponse = {
            error: false
        }
        Host.outputString(JSON.stringify(out));
    } else {
        const error: WasmPreRouteResponse = {
            error: true,
            status: 401,
            headers: {
                'Content-Type': 'text/plain'
            },
            body: "you're not authorized"
        }
        Host.outputString(JSON.stringify(error));
    }

    return 0
}