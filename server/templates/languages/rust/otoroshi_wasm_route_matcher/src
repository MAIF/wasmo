use extism_pdk::*;
use otoroshi_rust_types::types;

#[plugin_fn]
pub fn execute(Json(context): Json<types::WasmMatchRouteContext>) -> 
FnResult<Json<types::WasmMatchRouteResponse>> {
    Ok(Json(WasmMatchRouteResponse {
        result: context.request.headers.foo === "bar"
    }))
}