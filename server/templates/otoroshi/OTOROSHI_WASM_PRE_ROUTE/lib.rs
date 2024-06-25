use extism_pdk::*;
use otoroshi_rust_types::types;

#[plugin_fn]
pub fn execute(Json(context): Json<types::WasmPreRouteContext>) -> FnResult<Json<types::WasmPreRouteResponse>> {
    let out = types::WasmPreRouteResponse {
        error: Some(true),
        body: "you're not authorized",
        status: 401
    };

    match context.request.headers.get("bar") {
        Some(bar) => {
            if bar == "foo" {
                Ok(Json(types::WasmPreRouteResponse {
                    error: Some(false)
                }))
            } else {
                Ok(Json(types::WasmPreRouteResponse {
                    error: Some(true),
                    body: format!("{} is not authorized", bar).to_owned(),
                    status: 401
                }))
            }
        }
        None => Ok(Json(out)),
    }
}
