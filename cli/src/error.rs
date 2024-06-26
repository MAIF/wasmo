use std::fmt;

pub type WasmoResult<T> = std::result::Result<T, WasmoError>;

#[derive(Debug, Clone)]
pub enum WasmoError {
    PluginNotExists(),
    PluginCreationFailed(String),
    BuildInterrupt(String),
    FileSystem(String),
    NoDockerRunning(String),
    DockerContainer(String),
    Configuration(String),
    Raw(String)
}

impl fmt::Display for WasmoError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WasmoError::PluginCreationFailed(err) => {
                write!(f,"plugin failed to be create, {}", &err)
            }
            WasmoError::PluginNotExists() => {
                write!(f,"plugin not found")
            }
            WasmoError::NoDockerRunning(err) => {
                write!(f,"docker daemon can't be reach, {}", &err)
            }
            WasmoError::DockerContainer(err) => write!(f,"docker command failed, {}", &err),
            WasmoError::FileSystem(err) => {
                write!(f,"something happened using file system, {}", &err)
            },
            WasmoError::BuildInterrupt(err) => {
                write!(f,"something happened when building, {}", &err)
            },
            WasmoError::Configuration(err) => {
                write!(f,"something happened with the configuration, {}", &err)
            },
            WasmoError::Raw(err) => {
                write!(f, "{}", &err)
            }
        }
    }
}
