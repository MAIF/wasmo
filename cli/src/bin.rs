mod docker;
mod plugin;
mod websocket;
mod error;
mod port;
mod logger;

use clap::{Parser, Subcommand};
use error::{WasmoError, WasmoResult};
use hyper_tls::HttpsConnector;
use core::panic;
use hyper::{Body, Client, Method, Request};
use serde::Deserialize;
use std::{
    collections::HashMap,
    fs::{self, File},
    io::Write,
    path::{PathBuf, Path}, str::FromStr,
};

use dirs;

const WASMO_SERVER: &str = "WASMO_SERVER";
const WASMO_PATH: &str = "WASMO_PATH";
const WASMO_TOKEN: &str = "WASMO_TOKEN";
const WASMO_AUTHORIZATION_HEADER: &str = "WASMO_AUTHORIZATION_HEADER";

const ZIP_GO: &[u8] = include_bytes!("../templates/go.zip");
const ZIP_JS: &[u8] = include_bytes!("../templates/js.zip");
const ZIP_OPA: &[u8] = include_bytes!("../templates/opa.zip");
const ZIP_RUST: &[u8] = include_bytes!("../templates/rust.zip");
const ZIP_TS: &[u8] = include_bytes!("../templates/ts.zip");


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
        /// token
        #[arg(
            value_name = "TOKEN", 
            long = "token",
            required = false
        )]
        token: Option<String>,
    },
    /// Globally configure the CLI with the authorization token, the path where the configuration file will be stored and the server to reach during the build. These parameters are optional and can be passed when running the build command.
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
        /// The token access, used to authenticate the calls to the server
        #[arg(
            value_name = "TOKEN", 
            short = 't',
            long = "token",
            help = "The token access, used to authenticate the calls to the server",
            required = false
        )]
        token: Option<String>,
        /// The remote server to build your plugins
        #[arg(
            value_name = "SERVER", 
            short = 's',
            long = "server",
            help = "The remote server to build your plugins",
            required = false
        )]
        server: Option<String>,
        /// The cli authorization send to the remote or local builder
        #[arg(
            value_name = "DOCKER_AUTHORIZATION", 
            short = 'd',
            long = "docker_authorization",
            help = "The token expected by the docker wasmo container when building. The default value is foobar",
            required = false
        )]
        docker_authorization: Option<String>,

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

fn initialize(template: String, name: String, path: Option<String>) -> WasmoResult<()> {
    logger::loading("<yellow>Creating</> plugin ...".to_string());

    let manifest_dir = std::env::temp_dir();

    let zip_bytes = match template.as_str() {
        "go" => ZIP_GO,
        "js" => ZIP_JS,
        "opa" => ZIP_OPA,
        "rust" => ZIP_RUST,
        "ts" => ZIP_TS,
        _ => ZIP_JS
    };
    let zip_path = Path::new(&manifest_dir).join(format!("{}.zip", template));

    match std::path::Path::new(&zip_path).exists() {
        true => (),
        false => {
            logger::indent_println(format!("turn template bytes to zip file, {}", &zip_path.to_string_lossy()));
            match fs::File::create(&zip_path) {
                Ok(mut file) => match file.write_all(zip_bytes) {
                    Err(err) => return Err(WasmoError::FileSystem(err.to_string())),
                    Ok(()) => ()
                },
                Err(e) => return Err(WasmoError::FileSystem(e.to_string()))
            };
        }
    }

    logger::indent_println("<yellow>Unzipping</> the template ...".to_string());
    let zip_action = zip_extensions::read::zip_extract(
        &PathBuf::from(zip_path),
        &manifest_dir,
    );

    match zip_action {
        Ok(()) => rename_plugin(template, name, path),
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
    let wasmo_token = option_env!("WASMO_TOKEN");
    let wasmo_server = option_env!("WASMO_SERVER");

    let envs: HashMap<String, String> = if wasmo_server.is_none() || wasmo_server.is_none() {
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
        envs.insert(WASMO_TOKEN.to_owned(), wasmo_token.unwrap().to_owned());
        envs.insert(WASMO_PATH.to_owned(), get_option_home());
        envs
    };

    Ok(envs)
}

async fn build(path: Option<String>, server: Option<String>, host: Host, token: Option<String>) -> WasmoResult<()> {
    let mut configuration = read_configuration()?;

    let complete_path = match path {
        Some(p) => p,
        None => get_current_working_dir()?
    };

    if server.is_some() {
        configuration.insert(WASMO_SERVER.to_owned(), server.unwrap().to_owned());
    }

    if token.is_some() {
        configuration.insert(WASMO_TOKEN.to_owned(), token.unwrap().to_owned());
    }

    if !configuration.contains_key(WASMO_TOKEN) {
        return Err(WasmoError::BuildInterrupt("Should be able to build until WASMO_TOKEN is not defined".to_string()));
    }

    if !Path::new(&complete_path).exists() {
        return Err(WasmoError::PluginNotExists())
    }

    let mut container = None;

    if host != Host::Remote  {
        container = Some(docker::docker_create(&host, &configuration).await?);

        configuration.insert(WASMO_SERVER.to_owned(), format!("http://localhost:{}", &container.as_ref().unwrap().port).to_string());
    }

    if !configuration.contains_key(WASMO_SERVER) || configuration.get(WASMO_SERVER).unwrap().is_empty() {
        return Err(WasmoError::BuildInterrupt("Should be able to reach a wasmo server but WASMO_SERVER is not defined".to_string()));
    }

    logger::success("<yellow>Start</> building plugin".to_string());
    logger::indent_println(format!("plugin: {}", &complete_path));
    logger::indent_println(format!("server: {}", &configuration.get(WASMO_SERVER).unwrap()));
    
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

    let https = HttpsConnector::new();
    let client = Client::builder()
        .build::<_, hyper::Body>(https);

    let resp = client.request(request).await;

    match resp {
        Err(e) => panic!("{:#?}", e),
        Ok(k) => {
            logger::log(format!("Build call status: {}", k.status()));

            if k.status() == 403 {
                return Err(WasmoError::BuildInterrupt("".to_string()));
            }

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
    id: &str,
    output_path: &str,
    plugin: &plugin::Plugin,
) {
    let url = format!(
        "{}/local/wasm/{}",
        &configuration.get(WASMO_SERVER).unwrap(),
        id
    );

    logger::loading("<yellow>Fetch</> wasm file".to_string());
    logger::indent_println(format!("From endpoint {}", url));

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

fn set_configuration(token: Option<String>, server: Option<String>, path: Option<String>, docker_authorization: Option<String>) -> WasmoResult<()> {

    if token.is_none() && server.is_none() && path.is_none() && docker_authorization.is_none() {
        return Err(WasmoError::Configuration("missing token, server, path or docker_authorization keys".to_string()));
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

    let wasmo_token = extract_variable_or_default(&contents, WASMO_TOKEN, token);
    let wasmo_server = extract_variable_or_default(&contents, WASMO_SERVER, server);
    let wasmo_path = extract_variable_or_default(&contents, "WASMO_PATH", path.clone());
    let wasmo_docker_authorization = extract_variable_or_default(&contents, "DOCKER_AUTHORIZATION", path.clone());

    if wasmo_path.eq("") {
        let new_content = format!("WASMO_TOKEN={}\nWASMO_SERVER={}\nDOCKER_AUTHORIZATION={}", 
            wasmo_token, 
            wasmo_server, 
            wasmo_docker_authorization);

        match fs::write(home_path.join(".wasmo"), new_content) {
            Ok(()) => logger::println(format!("wasmo configuration patched")),
            Err(e) => panic!(
                "Should have been able to write the wasmo configuration, {:#?}",
                e
            ),
        }
    } else {
        let content_at_path = format!(
            "WASMO_TOKEN={}\nWASMO_SERVER={}\nWASMO_PATH={}\nDOCKER_AUTHORIZATION={}",
            wasmo_token, wasmo_server, wasmo_path, wasmo_docker_authorization
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
            name,
            path,
        } => initialize(template, name, path.map(absolute_path)),
        Commands::Build {
            server,
            path,
            host,
            token
        } => {
            build(path.map(absolute_path), server, Host::from_str(&host).unwrap(), token).await
        },
        Commands::Config { command } => match command {
            ConfigCommands::Set {
                token,
                server,
                path,
                docker_authorization
            } => set_configuration(token, server, path.map(absolute_path), docker_authorization),
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
}
