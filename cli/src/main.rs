mod docker;
mod plugin;
mod websocket;
mod error;

use clap::{Parser, Subcommand};
use error::{WasmoError, WasmoResult};
use core::panic;
use hyper::{Body, Client, Method, Request};
use paris::info;
use serde::Deserialize;
use std::{
    collections::HashMap,
    fs::{self, File},
    io::Write,
    path::PathBuf,
};

const WASMO_SERVER: &str = "WASMO_SERVER";
const WASMO_PATH: &str = "WASMO_PATH";
const WASMO_TOKEN: &str = "WASMO_TOKEN";
const WASMO_AUTHORIZATION_HEADER: &str = "WASMO_AUTHORIZATION_HEADER";

#[derive(Debug, Deserialize)]
struct WasmoBuildResponse {
    queue_id: String,
}

/// A fictional versioning CLI
#[derive(Debug, Parser)] // requires `derive` feature
#[command(name = "wasmo")]
#[command(about = "Wasmo builder CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Create and initialize a new plugin
    #[command()]
    Init {
        /// The template to clone
        #[arg(
            value_name = "TEMPLATE", 
            short = 't',
            long = "template",
            value_parser = ["js", "go", "rust", "opa", "ts"], 
            require_equals = true, 
        )]
        template: String,
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
    /// Build a plugin on current folder or at specific path
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
        /// using docker
        #[arg(
            value_name = "PROVIDER", 
            short = 'o',
            long = "provider",
            value_parser = ["REMOTE", "DOCKER"], 
            default_value = "DOCKER",
            require_equals = true,
            required = false
        )]
        provider: String,
    },
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
            required = false
        )]
        path: Option<String>,
        /// The token access, used to authenticate the calls to the server
        #[arg(
            value_name = "TOKEN", 
            short = 't',
            long = "token",
            required = false
        )]
        token: Option<String>,
        /// The remote server to build your plugins
        #[arg(
            value_name = "SERVER", 
            short = 's',
            long = "server",
            required = false
        )]
        server: Option<String>,
    },
    Get {},
}

fn rename_plugin(template: String, name: String, path: Option<String>) -> error::WasmoResult<()> {
    let complete_path = match &path {
        Some(p) => format!("{}/{}", p, name),
        None => format!("./{}", name),
    };

    let _ = match &path {
        Some(p) => fs::create_dir_all(p),
        None => Result::Ok(()),
    };

    match std::fs::rename(format!("./{}", template), &complete_path) {
        Ok(()) => {
            update_metadata_file(&complete_path.to_string(), &name, &template)?;
            info!("Plugin created: {}", &complete_path);
            Ok(())
        },
        Err(e) => Err(WasmoError::PluginCreationFailed(e.to_string())),
    }
}

fn update_metadata_file(path: &String, name: &String, template: &String) -> WasmoResult<()> {
    let metadata_file = match template.as_str() {
        "go" => "go.mod",
        "rust" => "cargo.toml",
        _ => "package.json"
    };

    let complete_path = format!("{}/{}", path, metadata_file);

    let content = match fs::read_to_string(&complete_path) {
        Err(err) => return Err(WasmoError::FileSystem(err.to_string())),
        Ok(v) => v
    };

    match fs::write(&complete_path, content.replace("@@PLUGIN_NAME@@", name).replace("@@PLUGIN_VERSION@@", "1.0.0")) {
        Err(err) => Err(WasmoError::FileSystem(err.to_string())),
        Ok(()) => Ok(())
    }
}

fn initialize(template: String, name: String, path: Option<String>) -> error::WasmoResult<()> {
    let zip_action = zip_extensions::read::zip_extract(
        &PathBuf::from(format!("../server/templates/{}.zip", template)),
        &PathBuf::from("./".to_string()),
    );

    match zip_action {
        Ok(()) => rename_plugin(template, name, path),
        Err(er) => Err(WasmoError::PluginAlreadyExists(er.to_string())),
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

fn configuration_file_to_env(configuration_path: String) -> HashMap<String, String> {
    let complete_path = if configuration_path.ends_with(".wasmo") {
        configuration_path
    } else {
        format!("{}/.wasmo", &configuration_path)
    };

    match std::path::Path::new(&complete_path).exists() {
        false => HashMap::new(),
        true => format(Some(match fs::read_to_string(&complete_path) {
            Ok(content) => content,
            Err(e) => panic!(
                "Should have been able to read the wasmo configuration, {:#?}, {:#?}",
                e, complete_path
            ),
        })),
    }
}

fn read_configuration() -> HashMap<String, String> {
    let wasmo_token = option_env!("WASMO_TOKEN");
    let wasmo_server = option_env!("WASMO_SERVER");

    let envs: HashMap<String, String> = if wasmo_server.is_none() || wasmo_server.is_none() {
        let configuration_path = match option_env!("WASMO_PATH") {
            Some(path) => path.to_owned(),
            None => get_home(),
        };

        let envs = configuration_file_to_env(format!("{}/.wasmo", configuration_path));

        match envs.get("WASMO_PATH") {
            Some(p) if !p.is_empty() => configuration_file_to_env(format!("{}/.wasmo", p)),
            _ => envs,
        }
    } else {
        let mut envs: HashMap<String, String> = HashMap::new();
        envs.insert(WASMO_SERVER.to_owned(), wasmo_server.unwrap().to_owned());
        envs.insert(WASMO_TOKEN.to_owned(), wasmo_token.unwrap().to_owned());
        envs.insert(WASMO_PATH.to_owned(), get_option_home());
        envs
    };

    envs
}

async fn build(path: Option<String>, mut server: Option<String>, using_docker: bool) -> Result<(), WasmoError> {
    let mut configuration = read_configuration();

    if using_docker {
        docker::docker_create().await?;

        server = Some("http://localhost:5001".to_string())
    }

    if server.is_some() {
        configuration.insert(WASMO_SERVER.to_string(), server.unwrap());
    }

    if !configuration.contains_key(WASMO_SERVER) {
        panic!("Should be able to reach a wasmo server but WASMO_SERVER is not defined");
    }

    if !configuration.contains_key(WASMO_TOKEN) {
        panic!("Should be able to build until WASMO_TOKEN is not defined");
    }

    info!(
        "Build plugin at path: {:#?}, with wasmo server: {:#?} ",
        path.clone().unwrap_or("<current-dir>".to_string()),
        &configuration.get(WASMO_SERVER).unwrap()
    );

    let complete_path = path.unwrap_or_else(get_current_working_dir);

    let plugin = plugin::read_plugin(&complete_path);

    let request = Request::builder()
        .method(Method::POST)
        .uri(format!(
            "{}/api/plugins/build",
            configuration.get(WASMO_SERVER).unwrap()
        ))
        .header("Content-Type", "application/json")
        .header(
            configuration
                .get(WASMO_AUTHORIZATION_HEADER)
                .unwrap_or(&"Authorization".to_string()),
            configuration.get(WASMO_TOKEN).unwrap(),
        )
        .body(Body::from(serde_json::to_string(&plugin).unwrap()))
        .unwrap();

    let client = Client::new();

    let resp = client.request(request).await;

    match resp {
        Err(e) => panic!("{:#?}", e),
        Ok(k) => {
            info!("{}", k.status());

            let body_bytes = hyper::body::to_bytes(k.into_body()).await;
            let result: WasmoBuildResponse = serde_json::from_str(
                String::from_utf8(body_bytes.unwrap().to_vec())
                    .unwrap()
                    .as_str(),
            )
            .unwrap();

            let build_result =
                websocket::ws_listen(&configuration.get(WASMO_SERVER).unwrap(), &result.queue_id)
                    .await;

            match build_result {
                websocket::BuildResult::Success => {
                    get_wasm(&configuration, &result.queue_id, &complete_path, &plugin).await;
                    info!("Successfull build")
                }
                _ => info!("Build failed"),
            }
        }
    }

    if using_docker {
        docker::remove_docker_container();
    }

    Ok(())
}

async fn get_wasm(
    configuration: &HashMap<String, String>,
    id: &str,
    output_path: &str,
    plugin: &plugin::Plugin,
) {
    let url = format!(
        "{}/local/wasm/{}",
        &configuration.get(WASMO_SERVER).unwrap(),
        id
    );

    info!("Fetch wasm file from {}", url);

    let request = Request::get(url)
        .header("Content-Type", "application/json")
        .header(
            configuration
                .get(WASMO_AUTHORIZATION_HEADER)
                .unwrap_or(&"Authorization".to_string()),
            configuration.get(WASMO_TOKEN).unwrap(),
        )
        .body(Body::empty())
        .unwrap();

    let client = Client::new();

    let resp = client.request(request).await;

    match resp {
        Err(e) => panic!("{:#?}", e),
        Ok(res) => {
            let filename = format!(
                "{}/{}-{}.wasm",
                output_path, &plugin.metadata.name, &plugin.metadata.version
            );
            let mut file = File::create(&filename).unwrap();

            info!("Writing file to {}", &filename);

            let content = hyper::body::to_bytes(res.into_body()).await;

            let _ = file.write(content.unwrap().to_vec().as_mut());
        }
    }
}

fn get_current_working_dir() -> String {
    match std::env::current_dir() {
        Ok(x) => x.into_os_string().into_string().unwrap(),
        Err(e) => panic!("Should be able to read the current directory, {}", e),
    }
}

fn reset_configuration() -> Result<(), WasmoError> {
    let home_path = get_home();

    let complete_path = format!("{}/.wasmo", &home_path);

    let _ = fs::remove_file(complete_path);

    info!("wasmo configuration has been reset");
    Ok(())
}

fn get_option_home() -> String {
    match home::home_dir() {
        Some(p) => p.into_os_string().into_string().unwrap(),
        None => "".to_owned(),
    }
}

fn get_home() -> String {
    match home::home_dir() {
        Some(p) => p.into_os_string().into_string().unwrap(),
        None => panic!("Impossible to get your home dir!"),
    }
}

fn set_configuration(token: Option<String>, server: Option<String>, path: Option<String>) -> Result<(), WasmoError> {
    let home_path = get_home();

    let complete_path = match &path {
        Some(p) => format!("{}/.wasmo", p),
        None => format!("{}/.wasmo", &home_path),
    };

    let contents = match std::path::Path::new(&complete_path).exists() {
        false => {
            if path.is_none() {
                format(None)
            } else {
                match fs::create_dir(&path.as_ref().unwrap()) {
                    Err(e) => panic!(
                        "Should have been able to create the wasmo configuration folder, {:#?}",
                        e
                    ),
                    Ok(()) => format(None),
                }
            }
        }
        true => configuration_file_to_env(complete_path.to_string()),
    };

    let wasmo_token = extract_variable_or_default(&contents, WASMO_TOKEN, token);
    let wasmo_server = extract_variable_or_default(&contents, WASMO_SERVER, server);

    let wasmo_path = extract_variable_or_default(&contents, "WASMO_PATH", path);

    if wasmo_path.eq("") {
        let new_content = format!("WASMO_TOKEN={}\nWASMO_SERVER={}", wasmo_token, wasmo_server);

        match fs::write(format!("{}/.wasmo", &home_path), new_content) {
            Ok(()) => info!("wasmo configuration patched"),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }
    } else {
        let content_at_path = format!(
            "WASMO_TOKEN={}\nWASMO_SERVER={}\nWASMO_PATH={}",
            wasmo_token, wasmo_server, wasmo_path
        );
        let content_at_default_path = format!("WASMO_PATH={}", wasmo_path);

        match fs::write(format!("{}/.wasmo", &home_path), &content_at_default_path) {
            Ok(()) => (),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }

        match fs::write(complete_path, &content_at_path) {
            Ok(()) => (),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }

        info!("wasmo configuration patched")
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), WasmoError> {
    let args = Cli::parse();

    match args.command {
        Commands::Init {
            template,
            name,
            path,
        } => initialize(template, name, path),
        Commands::Build {
            server,
            path,
            provider,
        } => build(path, server, provider == "DOCKER").await,
        Commands::Config { command } => match command {
            ConfigCommands::Set {
                token,
                server,
                path,
            } => set_configuration(token, server, path),
            ConfigCommands::Get {} => {
                let configuration = read_configuration();

                info!("{:#?}", configuration);

                Ok(())
            }
            ConfigCommands::Reset {} => reset_configuration(),
        },
    }
}
