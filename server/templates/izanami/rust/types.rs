use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct IzanamiContext {
    pub id: Option<String>,
    pub context: Option<HashMap<String, Value>>,
    pub executionContext: Option<Value>
}

#[derive(Serialize, Deserialize)]
pub struct IzanamiResponse {
    pub active: bool
}