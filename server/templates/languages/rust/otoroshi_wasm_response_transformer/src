use extism_pdk::*;
use otoroshi_rust_types::types;

#[plugin_fn]
pub fn execute(
    Json(context): Json<types::WasmResponseTransformerContext>,
) -> FnResult<Json<types::WasmResponse>> {
    let mut out_headers = context.request.headers;
    out_headers.insert(
        "OTOROSHI_WASM_PLUGIN_ID".to_string(),
        "OTOROSHI_WASM_RESPONSE_TRANSFORMER".to_string(),
    );
    out_headers.insert("Content-Type".to_string(), "text/plain".to_string());

    let out = types::WasmResponse {
        status: Some(200),
        error: None,
        body_str: Some("{ \"foo\": \"bar\" }".to_string()),
        headers: out_headers,
        cookies: serde_json::Value::Null,
        body_base64: None,
        body_bytes: None,
        body_json: None,
    };

    Ok(Json(out))
}
