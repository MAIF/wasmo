import { WasmMatchRouteContext, WasmMatchRouteResponse } from 'otoroshi-ts-types';

export declare var Host: any;

export function execute() {
  const context = JSON.parse(Host.inputString()) as WasmMatchRouteContext;

  const out: WasmMatchRouteResponse = {
    result: context.request.headers.foo === "bar"
  }

  Host.outputString(JSON.stringify(out));

  return 0;
}

