export const OTOROSHI_TEMPLATES = {
  "Request transformer": {
    key: "OTOROSHI_WASM_REQUEST_TRANSFORMER",
    description: "Transform the content of the request with a wasm plugin"
  },
  "Response transformer": {
    key: "OTOROSHI_WASM_RESPONSE_TRANSFORMER",
    description: "Transform the content of a response with a wasm plugin"
  },
  "Access control": {
    key: "OTOROSHI_WASM_ACCESS_CONTROL",
    description: "Delegate route access to a wasm plugin"
  },
  "Backend": {
    key: "OTOROSHI_WASM_BACKEND",
    description: "This plugin can be used to use a wasm plugin as backend"
  },
  "Route matcher": {
    key: "OTOROSHI_WASM_ROUTE_MATCHER",
    description: "This plugin can be used to use a wasm plugin as route matcher"
  },
  "Sink": {
    key: "OTOROSHI_WASM_SINK",
    description: "Handle unmatched requests with a wasm plugin"
  },
  "Router": {
    key: "OTOROSHI_WASM_ROUTER",
    description: "Can decide for routing with a wasm plugin"
  },
  "Pre route": {
    key: "OTOROSHI_WASM_PRE_ROUTE",
    description: "This plugin can be used to use a wasm plugin as in pre-route phase"
  },
}