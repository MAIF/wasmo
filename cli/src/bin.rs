mod docker;
mod plugin;
mod websocket;
mod error;
mod port;
mod logger;

use base64::{engine::general_purpose, Engine as _};
use clap::{Parser, Subcommand};
use error::{WasmoError, WasmoResult};
use hyper_tls::HttpsConnector;
use core::panic;
use hyper::{Body, Client, Method, Request};
use serde::Deserialize;
use std::{
    collections::HashMap, fs::{self, File}, hash::Hash, io::Write, path::{Path, PathBuf}, str::FromStr
};

use include_dir::{include_dir, Dir};


use dirs;

const WASMO_SERVER: &str = "WASMO_SERVER";
const WASMO_PATH: &str = "WASMO_PATH";
const WASMO_CLIENT_ID: &str = "WASMO_CLIENT_ID";
const WASMO_CLIENT_SECRET: &str = "WASMO_CLIENT_SECRET";

const EMPTY_ZIP_GO: &[u8] = include_bytes!("../templates/go.zip");
const EMPTY_ZIP_JS: &[u8] = include_bytes!("../templates/js.zip");
const EMPTY_ZIP_OPA: &[u8] = include_bytes!("../templates/opa.zip");
const EMPTY_ZIP_RUST: &[u8] = include_bytes!("../templates/rust.zip");
const EMPTY_ZIP_TS: &[u8] = include_bytes!("../templates/ts.zip");

const IZANAMI_ZIP_GO: &[u8] = include_bytes!("../templates/izanami/go.zip");
const IZANAMI_ZIP_JS: &[u8] = include_bytes!("../templates/izanami/js.zip");
const IZANAMI_ZIP_OPA: &[u8] = include_bytes!("../templates/izanami/opa.zip");
const IZANAMI_ZIP_RUST: &[u8] = include_bytes!("../templates/izanami/rust.zip");
const IZANAMI_ZIP_TS: &[u8] = include_bytes!("../templates/izanami/ts.zip");

const OTOROSHI_ZIP_GO: &[u8] = include_bytes!("../templates/otoroshi/go.zip");
const OTOROSHI_ZIP_JS: &[u8] = include_bytes!("../templates/otoroshi/js.zip");
const OTOROSHI_ZIP_OPA: &[u8] = include_bytes!("../templates/otoroshi/opa.zip");
const OTOROSHI_ZIP_RUST: &[u8] = include_bytes!("../templates/otoroshi/rust.zip");
const OTOROSHI_ZIP_TS: &[u8] = include_bytes!("../templates/otoroshi/ts.zip");

// const OTOROSHI_WASM_ACCESS_CONTROL_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_ACCESS_CONTROL.zip");
// const OTOROSHI_WASM_BACKEND_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_BACKEND.zip");
// const OTOROSHI_WASM_PRE_ROUTE_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_PRE_ROUTE.zip");
// const OTOROSHI_WASM_REQUEST_TRANSFORMER_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_REQUEST_TRANSFORMER.zip");
// const OTOROSHI_WASM_RESPONSE_TRANSFORMER_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_RESPONSE_TRANSFORMER.zip");
// const OTOROSHI_WASM_ROUTE_MATCHER_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_ROUTE_MATCHER.zip");
// const OTOROSHI_WASM_SINK_JS: &[u8] = include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_SINK.zip");

// const OTOROSHI_WASM_ACCESS_CONTROL_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_ACCESS_CONTROL.zip");
// const OTOROSHI_WASM_BACKEND_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_BACKEND.zip");
// const OTOROSHI_WASM_PRE_ROUTE_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_PRE_ROUTE.zip");
// const OTOROSHI_WASM_REQUEST_TRANSFORMER_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_REQUEST_TRANSFORMER.zip");
// const OTOROSHI_WASM_RESPONSE_TRANSFORMER_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_RESPONSE_TRANSFORMER.zip");
// const OTOROSHI_WASM_ROUTE_MATCHER_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_ROUTE_MATCHER.zip");
// const OTOROSHI_WASM_SINK_GO: &[u8] = include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_SINK.zip");

// const OTOROSHI_WASM_ACCESS_CONTROL_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OTOROSH_WASM_ACCESS_CONTROL.zip");
// const OTOROSHI_WASM_BACKEND_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OROSHI_WASM_BACKEND.zip");
// const OTOROSHI_WASM_PRE_ROUTE_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OTOSHI_WASM_PRE_ROUTE.zip");
// const OTOROSHI_WASM_REQUEST_TRANSFORMER_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASREQUEST_TRANSFORMER.zip");
// const OTOROSHI_WASM_RESPONSE_TRANSFORMER_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASMESPONSE_TRANSFORMER.zip");
// const OTOROSHI_WASM_ROUTE_MATCHER_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OTOROS_WASM_ROUTE_MATCHER.zip");
// const OTOROSHI_WASM_SINK_RUST: &[u8] = include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASM_SINK.zip");

// const OTOROSHI_WASM_ACCESS_CONTROL_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/OTOROSHGOWASM_ACCESS_CONTROL.zip");
// const OTOROSHI_WASM_BACKEND_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/GOOROSHI_WASM_BACKEND.zip");
// const OTOROSHI_WASM_PRE_ROUTE_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/OTGOOSHI_WASM_PRE_ROUTE.zip");
// const OTOROSHI_WASM_REQUEST_TRANSFORMER_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASGOREQUEST_TRANSFORMER.zip");
// const OTOROSHI_WASM_RESPONSE_TRANSFORMER_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASMGOESPONSE_TRANSFORMER.zip");
// const OTOROSHI_WASM_ROUTE_MATCHER_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/OTOROSGO_WASM_ROUTE_MATCHER.zip");
// const OTOROSHI_WASM_SINK_TS: &[u8] = include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASM_SINK.zip");
 
use lazy_static::lazy_static;

lazy_static! {
    static ref OTOROSHI_WASM_TEMPLATES: HashMap<&'static str, HashMap<&'static str, &'static[u8]>> = {
        let mut m: HashMap<&'static str, &'static[u8]> = HashMap::new();

        let mut js_plugins = HashMap::new();
        js_plugins.insert("ACCESS_CONTROL", include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_ACCESS_CONTROL.zip"));
        js_plugins.insert("BACKEND", include_str!("../templates/otoroshi/languages/JS/OROSHI_WASM_BACKEND.zip"));
        js_plugins.insert("PRE_ROUTE", include_str!("../templates/otoroshi/languages/JS/OTOSHI_WASM_PRE_ROUTE.zip"));
        js_plugins.insert("REQUEST_TRANSFORMER", include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_REQUEST_TRANSFORMER.zip"));
        js_plugins.insert("RESPONSE_TRANSFORMER", include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_RESPONSE_TRANSFORMER.zip"));
        js_plugins.insert("ROUTE_MATCHER", include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_ROUTE_MATCHER.zip"));
        js_plugins.insert("SINK", include_str!("../templates/otoroshi/languages/JS/OTOROSHI_WASM_SINK.zip"));

        let mut go_plugins = HashMap::new();
        go_plugins.insert("ACCESS_CONTROL", include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_ACCESS_CONTROL.zip"));
        go_plugins.insert("BACKEND", include_str!("../templates/otoroshi/languages/GO/OROSHI_WASM_BACKEND.zip"));
        go_plugins.insert("PRE_ROUTE", include_str!("../templates/otoroshi/languages/GO/OTOSHI_WASM_PRE_ROUTE.zip"));
        go_plugins.insert("REQUEST_TRANSFORMER", include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_REQUEST_TRANSFORMER.zip"));
        go_plugins.insert("RESPONSE_TRANSFORMER", include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_RESPONSE_TRANSFORMER.zip"));
        go_plugins.insert("ROUTE_MATCHER", include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_ROUTE_MATCHER.zip"));
        go_plugins.insert("SINK", include_str!("../templates/otoroshi/languages/GO/OTOROSHI_WASM_SINK.zip"));

        let mut ts_plugins = HashMap::new();
        ts_plugins.insert("ACCESS_CONTROL", include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASM_ACCESS_CONTROL.zip"));
        ts_plugins.insert("BACKEND", include_str!("../templates/otoroshi/languages/TS/OROSHI_WASM_BACKEND.zip"));
        ts_plugins.insert("PRE_ROUTE", include_str!("../templates/otoroshi/languages/TS/OTOSHI_WASM_PRE_ROUTE.zip"));
        ts_plugins.insert("REQUEST_TRANSFORMER", include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASM_REQUEST_TRANSFORMER.zip"));
        ts_plugins.insert("RESPONSE_TRANSFORMER", include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASM_RESPONSE_TRANSFORMER.zip"));
        ts_plugins.insert("ROUTE_MATCHER", include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASM_ROUTE_MATCHER.zip"));
        ts_plugins.insert("SINK", include_str!("../templates/otoroshi/languages/TS/OTOROSHI_WASM_SINK.zip"));

        let mut rust_plugins = HashMap::new();
        rust_plugins.insert("ACCESS_CONTROL", include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASM_ACCESS_CONTROL.zip"));
        rust_plugins.insert("BACKEND", include_str!("../templates/otoroshi/languages/RUST/OROSHI_WASM_BACKEND.zip"));
        rust_plugins.insert("PRE_ROUTE", include_str!("../templates/otoroshi/languages/RUST/OTOSHI_WASM_PRE_ROUTE.zip"));
        rust_plugins.insert("REQUEST_TRANSFORMER", include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASM_REQUEST_TRANSFORMER.zip"));
        rust_plugins.insert("RESPONSE_TRANSFORMER", include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASM_RESPONSE_TRANSFORMER.zip"));
        rust_plugins.insert("ROUTE_MATCHER", include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASM_ROUTE_MATCHER.zip"));
        rust_plugins.insert("SINK", include_str!("../templates/otoroshi/languages/RUST/OTOROSHI_WASM_SINK.zip"));

        m.insert("js", js_plugins);
        m.insert("go", go_plugins);
        m.insert("ts", ts_plugins);
        m.insert("rust", rust_plugins);

        m
    };
}

#[derive(Debug, PartialEq)]
pub enum Host {
    Docker,
    OneShotDocker,
    Remote
}

impl ToString for Host {
    fn to_string(&self) -> String {
        match &self {
            Host::Docker => String::from("Docker"),
            Host::OneShotDocker => String::from("OneShotDocker"),
            Host::Remote => String::from("Remote"),
        }
    }
}

impl FromStr for Host {
    type Err = ();

    fn from_str(input: &str) -> Result<Host, Self::Err> {
        match input {
            "Docker"            => Ok(Host::Docker),
            "docker"            => Ok(Host::Docker),
            "OneShotDocker"     => Ok(Host::OneShotDocker),
            "one_shot_docker"   => Ok(Host::OneShotDocker),
            "remote"            => Ok(Host::Remote),
            "Remote"            => Ok(Host::Remote),
            _                   => panic!("Bad host"),
        }
    }
}

#[derive(Debug, Deserialize)]
struct WasmoBuildResponse {
    queue_id: String,
}

/// A fictional versioning CLI
#[derive(Debug, Parser)] // requires `derive` feature
#[command(name = "wasmo")]
#[command(about = "Wasmo builder CLI", long_about = None, version = env!("CARGO_PKG_VERSION"))]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// get installed version
    Version {},
    /// Initialize a WASM plugin to the specific path. You can choose between many templates, javascript/typescript (js/ts), Open Policy Agent (opa), Rust or Golang (go).
    #[command()]
    Init {
        /// The template to clone
        #[arg(
            value_name = "TEMPLATE", 
            short = 't',
            long = "template",
            value_parser = [
                "js", 
                "go", 
                "rust", 
                "opa", 
                "ts",

                "izanami_js", 
                "izanami_go", 
                "izanami_rust", 
                "izanami_opa", 
                "izanami_ts",

                "otoroshi_js", 
                "otoroshi_go", 
                "otoroshi_rust", 
                "otoroshi_opa", 
                "otoroshi_ts"
            ], 
            require_equals = true, 
        )]
        template: Option<String>,
        #[arg(
            value_name = "PRODUCT", 
            short = 't',
            long = "product",
            value_parser = [
                "izanami",
                "otoroshi",
                "other"
            ], 
        )]
        product: Option<String>,
        /// The product template
        #[arg(
            value_name = "PRODUCT_TEMPLATE", 
            // short = 'p',
            long = "product_template",
            value_parser = [
                "ACCESS_CONTROL",
                "BACKEND",
                "PRE_ROUTE",
                "REQUEST_TRANSFORMER",
                "RESPONSE_TRANSFORMER",
                "ROUTE_MATCHER",
                "SINK",
            ]
        )]
        product_template: Option<String>,
        /// The language
        #[arg(
            value_name = "LANGUAGE", 
            // short = 'p',
            long = "language"
        )]
        language: Option<String>,
        /// The plugin name
        #[arg(
            value_name = "NAME", 
            short = 'n',
            long = "name"
        )]
        name: String,
        /// The path where initialize the plugin
        #[arg(
            value_name = "PATH", 
            short = 'p',
            long = "path",
            required = false
        )]
        path: Option<String>,
    },
    /// Build a plugin on current folder or to specific path
    #[command()]
    Build {
        /// The remote to target
        #[arg(
            value_name = "PATH", 
            short = 'p',
            long = "path",
            required = false
        )]
        path: Option<String>,
        /// The server to build
        #[arg(
            value_name = "SERVER", 
            short = 's',
            long = "server",
            required = false
        )]
        server: Option<String>,
        /// host
        #[arg(
            value_name = "HOST", 
            long = "host",
            value_parser = ["docker", "one_shot_docker", "remote", "Docker", "Remote", "OneShotDocker"], 
            default_value = "docker",
            require_equals = true,
            required = false
        )]
        host: String,
        /// client id
        #[arg(
            value_name = "CLIENT_ID", 
            long = "clientId",
            required = false
        )]
        client_id: Option<String>,
        /// client secret
        #[arg(
            value_name = "CLIENT_SECRET", 
            long = "clientSecret",
            required = false
        )]
        client_secret: Option<String>,
    },
    /// Globally configure the CLI with the path where the configuration file will be stored and the server to reach during the build. These parameters are optional and can be passed when running the build command.
    Config {
        #[command(subcommand)]
        command: ConfigCommands,
    },
}

#[derive(Debug, Subcommand)]
enum ConfigCommands {
    Reset {},
    Set {
        /// The path to the configuration folder
        #[arg(
            value_name = "PATH", 
            short = 'p',
            long = "path",
            help = "The path to the configuration folder",
            required = false

        )]
        path: Option<String>,
        /// The remote server to build your plugins
        #[arg(
            value_name = "SERVER", 
            short = 's',
            long = "server",
            help = "The remote server to build your plugins",
            required = false
        )]
        server: Option<String>,
        /// client id
        #[arg(
            value_name = "CLIENT_ID", 
            long = "clientId",
            required = false
        )]
        client_id: Option<String>,
        /// client secret
        #[arg(
            value_name = "CLIENT_SECRET", 
            long = "clientSecret",
            required = false
        )]
        client_secret: Option<String>,
    },
    Get {},
}

fn rename_plugin(template: String, name: String, path: Option<String>) -> WasmoResult<()> {
    let complete_path = match &path {
        Some(p) => Path::new(p).join(&name),
        None => Path::new("./").join(&name),
    };

    let _ = match &path {
        Some(p) => fs::create_dir_all(p),
        None => Result::Ok(()),
    };

    let manifest_dir = std::env::temp_dir();

    logger::indent_println(format!("<yellow>Write</> plugin from {} to {}", 
        &Path::new(&manifest_dir).join(format!("{}", template)).to_string_lossy(),
        &complete_path.to_string_lossy()));

    match std::fs::rename(Path::new(&manifest_dir).join(format!("{}", template)), &complete_path) {
        Ok(()) => {
            update_metadata_file(&complete_path, &name, &template)?;
            logger::println("<green>Plugin created</>".to_string());
            Ok(())
        },
        Err(e) => Err(WasmoError::PluginCreationFailed(e.to_string())),
    }
}

fn update_metadata_file(path: &PathBuf, name: &String, template: &String) -> WasmoResult<()> {
    let metadata_file = match template.as_str() {
        "go" => "go.mod",
        "rust" => "cargo.toml",
        _ => "package.json"
    };

    let complete_path = path.join(metadata_file);

    let content = match fs::read_to_string(&complete_path) {
        Err(err) => return Err(WasmoError::FileSystem(err.to_string())),
        Ok(v) => v
    };

    match fs::write(&complete_path, content.replace("@@PLUGIN_NAME@@", name).replace("@@PLUGIN_VERSION@@", "1.0.0")) {
        Err(err) => Err(WasmoError::FileSystem(err.to_string())),
        Ok(()) => Ok(())
    }
}

fn initialize_empty_project(language: String) -> &'static [u8] {
    match language.as_str() {
        "go"    => EMPTY_ZIP_GO,
        "js"    => EMPTY_ZIP_JS,
        "opa"   => EMPTY_ZIP_OPA,
        "rust"  => EMPTY_ZIP_RUST,
        "ts"    => EMPTY_ZIP_TS,
        _       => EMPTY_ZIP_TS
    }
}

fn get_otoroshi_template(language: String, product_template: String) -> &'static [u8] {
    match (language.as_str(), product_template.as_str()) {
        ("go", "")
    }
}

fn initialize(
        language: Option<String>,
        product: Option<String>,
        template: Option<String>, 
        product_template: Option<String>, 
        name: String, 
        path: Option<String>) -> WasmoResult<()> {
    logger::loading("<yellow>Creating</> plugin ...".to_string());

    let zip_bytes = match (language, product, template, product_template) {
        (Some(language), None, None, None) => initialize_empty_project(language),
        (Some(language), Some(product), None, Some(product_template)) => get_otoroshi_template(language, product_template),
        (None, None, Some(template), None) => 
            match template.as_str() {
                "go" => EMPTY_ZIP_GO,
                "js" => EMPTY_ZIP_JS,
                "opa" => EMPTY_ZIP_OPA,
                "rust" => EMPTY_ZIP_RUST,
                "ts" => EMPTY_ZIP_TS,
                
                "izanami_go"    => IZANAMI_ZIP_GO,
                "izanami_js"    => IZANAMI_ZIP_JS,
                "izanami_opa"   => IZANAMI_ZIP_OPA,
                "izanami_rust"  => IZANAMI_ZIP_RUST,
                "izanami_ts"    => IZANAMI_ZIP_TS,
                
                "otoroshi_go"   => OTOROSHI_ZIP_GO,
                "otoroshi_js"   => OTOROSHI_ZIP_JS,
                "otoroshi_opa"  => OTOROSHI_ZIP_OPA,
                "otoroshi_rust" => OTOROSHI_ZIP_RUST,
                "otoroshi_ts"   => OTOROSHI_ZIP_TS,
                
                _ => EMPTY_ZIP_JS
            },
        (_, _, _, _) => return Err(WasmoError::Configuration("You should provide language, product, and template parameters, or use only the deprecated template parameter.".to_string()))
    };
    
    let language_used = template.replace("izanami_", "").replace("otoroshi_", "");
    
    let manifest_dir = std::env::temp_dir();
    let zip_path = Path::new(&manifest_dir).join(format!("{}.zip", &language_used));

    if std::path::Path::new(&zip_path).exists() {
        let _ = fs::remove_file(&zip_path);
    }
        
    logger::indent_println(format!("turn template bytes to zip file, {}", &zip_path.to_string_lossy()));
    match fs::File::create(&zip_path) {
        Ok(mut file) => match file.write_all(zip_bytes) {
            Err(err) => return Err(WasmoError::FileSystem(err.to_string())),
            Ok(()) => ()
        },
        Err(e) => return Err(WasmoError::FileSystem(e.to_string()))
    };

    logger::indent_println("<yellow>Unzipping</> the template ...".to_string());
    let zip_action = zip_extensions::read::zip_extract(
        &PathBuf::from(zip_path),
        &manifest_dir,
    );

    match zip_action {
        Ok(()) => rename_plugin(language_used, name, path),
        Err(er) => Err(WasmoError::FileSystem(er.to_string())),
    }
}

fn extract_variable_or_default(
    contents: &std::collections::HashMap<String, String>,
    key: &str,
    default_value: Option<String>,
) -> String {
    let default = default_value.clone().unwrap_or("".to_string());

    match contents.get(key) {
        Some(v) => match v.is_empty() {
            true => default,
            false => default_value.unwrap_or(v.to_string()),
        },
        None => default,
    }
}

fn format(str: Option<String>) -> std::collections::HashMap<String, String> {
    match str {
        None => std::collections::HashMap::new(),
        Some(str) => str
            .split("\n")
            .map(|x| {
                let mut parts = x.splitn(2, "=");
                (
                    parts.next().unwrap_or("").to_string(),
                    parts.next().unwrap_or("").to_string(),
                )
            })
            .into_iter()
            .collect(),
    }
}

fn configuration_file_to_hashmap(configuration_path: &PathBuf) -> HashMap<String, String> {
    let complete_path = if configuration_path.ends_with(".wasmo") {
        configuration_path.clone()
    } else {
        Path::new(configuration_path).join(".wasmo")
    };

    match std::path::Path::new(&complete_path).exists() {
        false => HashMap::new(),
        true => format(Some(match fs::read_to_string(&complete_path) {
            Ok(content) => content,
            Err(_) => String::new()
        })),
    }
}

fn read_configuration() -> WasmoResult<HashMap<String, String>> {
    let wasmo_client_id = option_env!("WASMO_CLIENT_ID");
    let wasmo_client_secret = option_env!("WASMO_CLIENT_SECRET");
    let wasmo_server = option_env!("WASMO_SERVER");

    let envs: HashMap<String, String> = if wasmo_server.is_none() || wasmo_client_id.is_none() || wasmo_client_secret.is_none() {
        let configuration_path: PathBuf = match option_env!("WASMO_PATH") {
            Some(path) => Path::new(path).to_path_buf(),
            None => get_home().unwrap(),
        };

        let envs = configuration_file_to_hashmap(&configuration_path.join(".wasmo"));

        match envs.get("WASMO_PATH") {
            Some(p) if !p.is_empty() => configuration_file_to_hashmap(&Path::new(p).join(".wasmo")),
            _ => envs,
        }
    } else {
        let mut envs: HashMap<String, String> = HashMap::new();
        envs.insert(WASMO_SERVER.to_owned(), wasmo_server.unwrap().to_owned());
        envs.insert(WASMO_CLIENT_ID.to_owned(), wasmo_client_id.unwrap().to_owned());
        envs.insert(WASMO_CLIENT_SECRET.to_owned(), wasmo_client_secret.unwrap().to_owned());
        envs.insert(WASMO_PATH.to_owned(), get_option_home());
        envs
    };

    Ok(envs)
}

async fn build(path: Option<String>, server: Option<String>, host: Host, client_id: Option<String>, client_secret: Option<String>) -> WasmoResult<()> {
    let mut configuration = read_configuration()?;

    let complete_path = match path {
        Some(p) => p,
        None => get_current_working_dir()?
    };

    if server.is_some() {
        configuration.insert(WASMO_SERVER.to_owned(), server.unwrap().to_owned());
    }

    if client_id.is_some() {
        configuration.insert(WASMO_CLIENT_ID.to_owned(), client_id.unwrap().to_owned());
    }

    if client_secret.is_some() {
        configuration.insert(WASMO_CLIENT_SECRET.to_owned(), client_secret.unwrap().to_owned());
    }

    if !Path::new(&complete_path).exists() {
        return Err(WasmoError::PluginNotExists())
    }

    let mut container = None;

    if host != Host::Remote  {
        container = Some(docker::docker_create(&host).await?);

        configuration.insert(WASMO_SERVER.to_owned(), format!("http://localhost:{}", &container.as_ref().unwrap().port).to_string());
    }

    if !configuration.contains_key(WASMO_SERVER) || configuration.get(WASMO_SERVER).unwrap().is_empty() {
        return Err(WasmoError::BuildInterrupt("Should be able to reach a wasmo server but WASMO_SERVER is not defined".to_string()));
    }

    logger::success("<yellow>Start</> building plugin".to_string());
    logger::indent_println(format!("plugin: {}", &complete_path));
    logger::indent_println(format!("server: {}", &configuration.get(WASMO_SERVER).unwrap()));
    
    let plugin = plugin::read_plugin(&complete_path);

    let authorization = format!("Basic {}", 
        general_purpose::STANDARD_NO_PAD.encode(format!("{}:{}", 
        configuration.get(WASMO_CLIENT_ID).unwrap_or(&"".to_string()), 
        configuration.get(WASMO_CLIENT_SECRET).unwrap_or(&"".to_string()))));

    let request = Request::builder()
        .method(Method::POST)
        .uri(format!(
            "{}/api/plugins/build",
            configuration.get(WASMO_SERVER).unwrap()
        ))
        .header("Content-Type", "application/json")
        .header("Authorization", &authorization)
        .body(Body::from(serde_json::to_string(&plugin).unwrap()))
        .unwrap();

    let https = HttpsConnector::new();
    let client = Client::builder()
        .build::<_, hyper::Body>(https);

    let resp = client.request(request).await;

    match resp {
        Err(e) => panic!("{:#?}", e),
        Ok(k) => {
            logger::indent_println(format!("Build call status: {}", k.status()));

            if k.status() == 403 || k.status() == 401 {
                return Err(WasmoError::BuildInterrupt("unauthorized".to_string()));
            }

            let body_bytes = hyper::body::to_bytes(k.into_body()).await;
            let result: WasmoBuildResponse = serde_json::from_str(
                String::from_utf8(body_bytes.unwrap().to_vec())
                    .unwrap()
                    .as_str(),
            )
            .unwrap();

            let build_result =
                websocket::ws_listen(&configuration.get(WASMO_SERVER).unwrap(), 
                &result.queue_id,
                        &authorization)
                    .await;

            match build_result {
                websocket::BuildResult::Success => {
                    get_wasm(&configuration, &complete_path, &plugin).await;
                }
                _ => logger::println(format!("Build failed")),
            }
        }
    }

    if host == Host::OneShotDocker {
        docker::remove_docker_container(&container.unwrap().name).await;
    }

    Ok(())
}

async fn get_wasm(
    configuration: &HashMap<String, String>,
    output_path: &str,
    plugin: &plugin::Plugin,
) {
    let url = format!(
        "{}/local/wasm/{}",
        &configuration.get(WASMO_SERVER).unwrap(),
        format!("{}-{}-dev", &plugin.metadata.name, &plugin.metadata.version)
    );

    logger::loading("<yellow>Fetch</> wasm file".to_string());
    logger::indent_println(format!("From endpoint {}", url));

    let request = Request::get(url)
        .header("Content-Type", "application/json")
        .header("Authorization",
         general_purpose::STANDARD_NO_PAD.encode(format!("{}:{}", 
         configuration.get(WASMO_CLIENT_ID).unwrap_or(&"".to_string()), 
         configuration.get(WASMO_CLIENT_SECRET).unwrap_or(&"".to_string()))
        ))
        .body(Body::empty())
        .unwrap();

    let https = HttpsConnector::new();
    let client = Client::builder()
        .build::<_, hyper::Body>(https);

    let resp = client.request(request).await;

    match resp {
        Err(e) => panic!("{:#?}", e),
        Ok(res) => {
            let filename = format!(
                "{}/{}-{}.wasm",
                output_path, &plugin.metadata.name, &plugin.metadata.version
            );
            let mut file = File::create(&filename).unwrap();

            logger::loading("<yellow>Writing</> file".to_string());
            logger::indent_println(format!("Saved WASM file to {}", &filename));

            let content = hyper::body::to_bytes(res.into_body()).await;

            let _ = file.write(content.unwrap().to_vec().as_mut());
        }
    }
}

fn get_current_working_dir() -> WasmoResult<String> {
    match std::env::current_dir() {
        Ok(x) => Ok(x.into_os_string().into_string().unwrap()),
        Err(e) => Err(WasmoError::FileSystem(format!("Should be able to read the current directory, {}", e))),
    }
}

fn reset_configuration() -> WasmoResult<()> {
    logger::loading("<yellow>Reset</> configuration".to_string());
    let home_path = get_home()?;

    let complete_path = home_path.join(".wasmo");

    let _ = fs::remove_file(complete_path);

    logger::check_loading();
    logger::success(format!("<green>wasmo configuration has been reset</>"));
    Ok(())
}

fn get_option_home() -> String {
    match dirs::home_dir() {
        Some(p) => p.into_os_string().into_string().unwrap(),
        None => "".to_owned(),
    }
}

fn get_home() -> WasmoResult<PathBuf> {
    match dirs::home_dir() {
        Some(p) => Ok(p),
        None => Err(WasmoError::FileSystem(format!("Impossible to get your home dir!"))),
    }
}

fn absolute_path(path: String) -> String {
    match expand_tilde(&path) {
        None => fs::canonicalize(path).unwrap().into_os_string().into_string().unwrap(),
        Some(path) => match fs::canonicalize(path) {
            Ok(res) => res.into_os_string().into_string().unwrap(),
            Err(err) => panic!("{:#?}", err)
        }
    }
}

fn expand_tilde<P: AsRef<Path>>(path_user_input: P) -> Option<PathBuf> {
    let p = path_user_input.as_ref();
    if !p.starts_with("~") {
        return Some(p.to_path_buf());
    }
    if p == Path::new("~") {
        return dirs::home_dir();
    }
    dirs::home_dir().map(|mut h| {
        if h == Path::new("/") {
            // Corner case: `h` root directory;
            // don't prepend extra `/`, just drop the tilde.
            p.strip_prefix("~").unwrap().to_path_buf()
        } else {
            h.push(p.strip_prefix("~/").unwrap());
            h
        }
    })
}

fn set_configuration(server: Option<String>, path: Option<String>, client_id: Option<String>, client_secret: Option<String>) -> WasmoResult<()> {

    if client_id.is_none() && client_secret.is_none() && server.is_none() && path.is_none() {
        return Err(WasmoError::Configuration("missing client_id, client_secret or path keys".to_string()));
    }

    let home_path = get_home()?;

    let complete_path = match &path {
        Some(p) => Path::new(p).join(".wasmo"),
        None => home_path.join(".wasmo"),
    };

    let contents = match std::path::Path::new(&complete_path).exists() {
        false => {
            if path.is_some() {
                let _ = fs::create_dir(&path.as_ref().unwrap());
            } 
            format(None)
        }
        true => configuration_file_to_hashmap(&complete_path),
    };

    let wasmo_client_id = extract_variable_or_default(&contents, WASMO_CLIENT_ID, client_id);
    let wasmo_client_secret = extract_variable_or_default(&contents, WASMO_CLIENT_SECRET, client_secret);
    let wasmo_server = extract_variable_or_default(&contents, WASMO_SERVER, server);
    let wasmo_path = extract_variable_or_default(&contents, "WASMO_PATH", path.clone());

    if wasmo_path.eq("") {
        let new_content = format!("WASMO_SERVER={}\nWASMO_CLIENT_ID={}\nWASMO_CLIENT_SECRET={}",
            wasmo_server,
            wasmo_client_id,
            wasmo_client_secret);

        match fs::write(home_path.join(".wasmo"), new_content) {
            Ok(()) => logger::println(format!("wasmo configuration patched")),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }
    } else {
        let content_at_path = format!(
            "WASMO_SERVER={}\nWASMO_PATH={}\nWASMO_CLIENT_ID={}\nWASMO_CLIENT_SECRET={}",
            wasmo_server, wasmo_path, wasmo_client_id, wasmo_client_secret
        );
        let content_at_default_path = format!("WASMO_PATH={}", wasmo_path);

        let home_file = home_path.join(".wasmo");

        // println!("Write in home {} - {}", format!("{}/.wasmo", &home_path), content_at_default_path);
        let _ = fs::remove_file(&home_file);
        match fs::write(&home_file, &content_at_default_path) {
            Ok(()) => (),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }

        let project_file = match &path {
            Some(p) => Path::new(p).join(".wasmo"),
            None => match wasmo_path.is_empty() {
                true => home_path.join(".wasmo"),
                false => Path::new(&wasmo_path).join(".wasmo")
            }
        }
            .to_string_lossy()
            .to_string()
            .replace(".wasmo.wasmo", ".wasmo"); // guard

        // println!("Write inside project, {} - {:#?}", project_file, content_at_path);
        let _ = fs::remove_file(&project_file);
        match fs::write(project_file, &content_at_path) {
            Ok(()) => (),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }

        logger::println(format!("wasmo configuration patched"))
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    let args = Cli::parse();

    let out = match args.command {
        Commands::Version {} => {
            logger::success(format!("Wasmo version: {}", env!("CARGO_PKG_VERSION")));
            Ok(())
        },
        Commands::Init {
            template,
            language,
            product,
            product_template,
            name,
            path,
        } => initialize(language, product, template, product_template,  name, path.map(absolute_path)),
        Commands::Build {
            server,
            path,
            host,
            client_id,
            client_secret
        } => {
            build(path.map(absolute_path), server, Host::from_str(&host).unwrap(), client_id, client_secret).await
        },
        Commands::Config { command } => match command {
            ConfigCommands::Set {
                client_id,
                client_secret,
                server,
                path
            } => set_configuration(server, path.map(absolute_path), client_id, client_secret),
            ConfigCommands::Get {} => {
                logger::loading("<yellow>Read</> configuration".to_string());
                let configuration = read_configuration().unwrap();

                logger::indent_println(format!("{:#?}", configuration));

                Ok(())
            }
            ConfigCommands::Reset {} => reset_configuration(),
        },
    };

    if let Err(e) = out {
        logger::error(format!("{}", e));
        std::process::exit(1);
     }

     std::process::exit(0);
}
