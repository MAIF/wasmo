use clap::{Parser, Subcommand};
use std::{fs, path::PathBuf, collections::HashMap};

const WASMO_SERVER: &str = "WASMO_SERVER";
const WASMO_PATH: &str = "WASMO_PATH";
const WASMO_TOKEN: &str = "WASMO_TOKEN";

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
    #[command(arg_required_else_help = true)]
    Init {
        /// The template to clone
        #[arg(value_name = "TEMPLATE")]
        template: String,
        /// The plugin name
        #[arg(value_name = "NAME")]
        name: String,
        /// The path where initialize the plugin
        #[arg(value_name = "PATH")]
        path: Option<String>,
    },
    /// Build a plugin on current folder or at specific path
    #[command(arg_required_else_help = true)]
    Build {
        /// The remote to target
        #[arg(value_name = "PATH")]
        path: Option<String>,
        /// The server to build
        #[arg(value_name = "SERVER")]
        server: Option<String>,
    },
    Config {
        #[command(subcommand)]
        command: ConfigCommands,
    },
}

#[derive(Debug, Subcommand)]
enum ConfigCommands {
    Set {
        /// The path to the configuration folder
        #[arg(value_name = "PATH")]
        path: Option<String>,
        /// The token access, used to authenticate the calls to the server
        #[arg(value_name = "TOKEN")]
        token: Option<String>,
        /// The remote server to build your plugins
        #[arg(value_name = "SERVER")]
        server: Option<String>,
    },
    Get {},
}

fn rename_plugin(template: String, name: String, path: Option<String>) {
    let complete_path = match &path {
        Some(p) => format!("{}/{}", p, name),
        None => format!("./{}", name),
    };

    let _ = match path {
        Some(p) => fs::create_dir_all(p),
        None => Result::Ok(()),
    };

    match std::fs::rename(format!("./{}", template), complete_path) {
        Ok(()) => println!("plugin created"),
        Err(e) => panic!("Can't create new plugin: {:#?}", e),
    }
}

fn initialize(template: String, name: String, path: Option<String>) {
    let plugin_types: Vec<String> = vec![
        "ts".to_string(),
        "js".to_string(),
        "go".to_string(),
        "opa".to_string(),
        "rust".to_string(),
    ];

    if !plugin_types.contains(&template) {
        println!("Oh noes: plugin type must be {:#?}", plugin_types);
        std::process::exit(1);
    }

    let zip_action = zip_extensions::read::zip_extract(
        &PathBuf::from(format!("../server/templates/{}.zip", template)),
        &PathBuf::from("./".to_string()),
    );

    match zip_action {
        Ok(()) => rename_plugin(template, name, path),
        Err(er) => panic!("Can't create new plugin: {:#?}", er),
    }
}

fn extract_variable_or_default(
    contents: &std::collections::HashMap<String, String>,
    key: &str,
    default_value: Option<String>,
) -> String {
    let default = default_value.unwrap_or("".to_string());

    match contents.get(key) {
        Some(v) => match v.is_empty() {
            true => default,
            false => v.to_string(),
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
    let complete_path = if configuration_path.ends_with(".wasmo") { configuration_path } else { format!("{}/.wasmo", &configuration_path) };

    format(Some(match fs::read_to_string(&complete_path) {
        Ok(content) => content,
        Err(e) => panic!(
            "Should have been able to read the wasmo configuration, {:#?}",
            e
        ),
    }))
}

fn read_configuration() -> HashMap<String, String> {

    let wasmo_token = option_env!("WASMO_TOKEN");
    let wasmo_server = option_env!("WASMO_SERVER");

    let envs: HashMap<String, String> = if wasmo_server.is_none() || wasmo_server.is_none() {
        let configuration_path = match option_env!("WASMO_PATH") {
            Some(path) => path.to_owned(),
            None => get_home()
        };

        let envs = configuration_file_to_env(format!("{}/.wasmo", configuration_path));

        match envs.get("WASMO_PATH") {
            Some(p) if !p.is_empty() => configuration_file_to_env(format!("{}/.wasmo", p)),
            _ => envs
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

fn set_configuration(token: Option<String>, server: Option<String>, path: Option<String>) {
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
            Ok(()) => println!("wasmo configuration patched"),
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

        println!("wasmo configuration patched")
    }
}

fn main() {
    let args = Cli::parse();

    match args.command {
        Commands::Init {
            template,
            name,
            path,
        } => initialize(template, name, path),
        Commands::Build { server, path } => {
            println!("Build {:#?} {:#?}", path, server);
        }
        Commands::Config { command } => match command {
            ConfigCommands::Set {
                token,
                server,
                path,
            } => set_configuration(token, server, path),
            ConfigCommands::Get {} => {
                let configuration = read_configuration();

                println!("{:#?}", configuration);
            },
        },
    }
}
