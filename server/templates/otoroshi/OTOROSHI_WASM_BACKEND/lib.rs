use extism_pdk::*;
use otoroshi_rust_types::types;
use std::collections::HashMap;

#[plugin_fn]
pub fn execute(Json(context): Json<types::WasmBackendContext>) -> FnResult<Json<types::WasmBackendResponse>> {
    let mut headers = HashMap::new();
    headers.insert("foo".to_string(), "bar".to_string());

    let response = types::WasmBackendResponse { 
        headers: Some(headers.into_iter().chain(context.raw_request.headers).collect()), 
        body_str: Some(r#"<html lang="en">

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
            </html>"#.to_owned()),
        body_base64: None,
        body_bytes: None,
        body_json: None,
        status: 200
    };
  
    Ok(Json(response))
}