use clap::{Parser, Subcommand};
use std::{path::PathBuf, fs};

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
}

fn rename_plugin(template: String, name: String, path: Option<String>) {
    let complete_path = match &path {
        Some(p) => format!("{}/{}", p, name),
        None => format!("./{}", name)
    };

    let _ = match path {
        Some(p) => fs::create_dir_all(p),
        None => Result::Ok(())
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

fn main() {
    let args = Cli::parse();

    match args.command {
        Commands::Init { template, name, path } => initialize(template, name, path),
        Commands::Build { server, path } => {
            println!("Build {:#?} {:#?}", path, server);
        }
    }
}
