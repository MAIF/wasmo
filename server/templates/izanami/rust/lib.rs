mod types;

use extism_pdk::*;

#[plugin_fn]
pub fn execute(Json(_context): Json<types::IzanamiContext>) -> FnResult<Json<types::IzanamiResponse>> {
    let out = types::IzanamiResponse { 
        active: true
    };
    Ok(Json(out))
}