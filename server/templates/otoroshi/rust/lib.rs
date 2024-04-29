use extism_pdk::*;
use otoroshi_rust_types::types::*;

#[plugin_fn]
pub fn execute(
    Json(_context): Json<WasmAccessValidatorContext>,
) -> FnResult<Json<WasmAccessValidatorResponse>> {
    let out = WasmAccessValidatorResponse {
        result: false,
        error: Some(WasmAccessValidatorError {
            message: "you're not authorized".to_owned(),
            status: 401,
        }),
    };
    Ok(Json(out))
}

/*

// WasmRouteMatcher

#[plugin_fn]
pub fn matches_route(Json(_context): Json<WasmMatchRouteContext>) -> FnResult<Json<WasmMatchRouteResponse>> {
    ///
}

// -------------------------

// WasmPreRoute

#[plugin_fn]
pub fn pre_route(Json(_context): Json<WasmPreRouteContext>) -> FnResult<Json<WasmPreRouteResponse>> {
    ///
}

// -------------------------

// WasmAccessValidator

#[plugin_fn]
pub fn can_access(Json(_context): Json<WasmAccessValidatorContext>) -> FnResult<Json<WasmAccessValidatorResponse>> {
    ///
}

// -------------------------

// WasmRequestTransformer


#[plugin_fn]
pub fn transform_request(Json(_context): Json<WasmRequestTransformerContext>) -> FnResult<Json<WasmTransformerResponse>> {
    ///
}

// -------------------------

// WasmBackend

#[plugin_fn]
pub fn call_backend(Json(_context): Json<WasmQueryContext>) -> FnResult<Json<WasmQueryResponse>> {
    ///
}

// -------------------------

// WasmResponseTransformer

#[plugin_fn]
pub fn transform_response(Json(_context): Json<WasmResponseTransformerContext>) -> FnResult<Json<WasmTransformerResponse>> {
    ///
}

// -------------------------

// WasmSink

#[plugin_fn]
pub fn sink_matches(Json(_context): Json<WasmSinkContext>) -> FnResult<Json<WasmSinkMatchesResponse>> {
    ///
}

#[plugin_fn]
pub fn sink_handle(Json(_context): Json<WasmSinkContext>) -> FnResult<Json<WasmSinkHandleResponse>> {
    ///
}

// -------------------------

// WasmRequestHandler

#[plugin_fn]
pub fn handle_request(Json(_context): Json<WasmRequestHandlerContext>) -> FnResult<Json<WasmRequestHandlerResponse>> {
    ///
}

// -------------------------

// WasmJob

#[plugin_fn]
pub fn job_run(Json(_context): Json<WasmJobContext>) -> FnResult<Json<WasmJobResult>> {
    ///
}

*/
