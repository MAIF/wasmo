use extism_pdk::*;
use otoroshi_rust_types::types::*;

#[plugin_fn]
pub fn execute(
    Json(_context): Json<WasmPreRouteContext>,
) -> FnResult<Json<WasmPreRouteResponse>> {
    let out = types::WasmPreRouteResponse {
        error: true,
        body: "you're not authorized",
        status: 401
    };

    match context.request.headers.get("bar") {
        Some(bar) => {
            if bar == "foo" {
                Ok(Json({
                    error: false
                }))
            } else {
                Ok(Json({
                    error: true,
                    body: format!("{} is not authorized", bar).to_owned(),
                    status: 401
                }))
            }
        }
        None => Ok(Json(out)),
    }
}
