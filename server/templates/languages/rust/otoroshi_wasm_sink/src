use extism_pdk::*;
use otoroshi_rust_types::types;

#[plugin_fn]
pub fn sink_matches(
    Json(context): Json<types::WasmSinkContext>,
) -> FnResult<Json<types::WasmSinkMatchesResponse>> {
    Ok(Json(types::WasmSinkMatchesResponse { result: true }))
}

#[plugin_fn]
pub fn sink_handle(
    Json(context): Json<types::WasmSinkContext>,
) -> FnResult<Json<types::WasmSinkHandleResponse>> {
    let path: String = context.request.path;

    Ok(Json(types::WasmSinkHandleResponse {
        status: 404,
        body_str: Some(format!(
            r#"{{ "WASM_SINK_RESPONSE": "Unknown path and domain for {}" }}"#,
            path
        )),
        headers: context.request.headers,
        body_base64: None,
        body_bytes: None,
        body_json: None,
    }))
}
