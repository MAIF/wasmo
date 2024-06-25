import { WasmSinkContext, WasmSinkMatchesResponse, WasmSinkHandleResponse } from 'otoroshi-ts-types';

export declare var Host: any;

export function sink_matches() {
  // const context = JSON.parse(Host.inputString()) as WasmSinkContext;

  const out: WasmSinkMatchesResponse = {
    result: true
  }

  Host.outputString(JSON.stringify(out));

  return 0;
}

export function sink_handle() {
  const context = JSON.parse(Host.inputString()) as WasmSinkContext;

  const out: WasmSinkHandleResponse = {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body_json: {
      "WASM_SINK_RESPONSE": `Unknown path and domain for ${context.request.path}`
    }
  }

  Host.outputString(JSON.stringify(out))

  return 0
}