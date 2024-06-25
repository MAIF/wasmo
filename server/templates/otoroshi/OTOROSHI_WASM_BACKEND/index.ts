import { WasmQueryContext, WasmQueryResponse } from 'otoroshi-ts-types';

export declare var Host: any;

export function execute() {
  const context = JSON.parse(Host.inputString()) as WasmQueryContext;

  const headers = {
    "foo": "bar",
    ...(context.request.headers || {})
  }

  const response: WasmQueryResponse = {
    headers,
    status: 200,
    body: `<html lang="en">

            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            
            <body style="
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                height: 100vh;
                font-family: monospace;
            ">
                <h1>This HTML comes from the Wasmo plugin</h1>
                <img src="https://maif.github.io/wasmo/wasmo.png" style="
                width: 200;
            ">
            
            </body>
            </html>`,
  };
  Host.outputString(JSON.stringify(response));

  return 0;
}

