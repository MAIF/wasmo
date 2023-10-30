use std::fmt;

pub type WasmoResult<T> = std::result::Result<T, WasmoError>;

#[derive(Debug, Clone)]
pub enum WasmoError {
    PluginAlreadyExists(String),
    PluginNotExists(),
    PluginCreationFailed(String),
    FileSystem(String),
    NoDockerRunning(String),
    DockerContainer(String),
}

impl fmt::Display for WasmoError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WasmoError::PluginAlreadyExists(err) => write!(f,
                "a plugin with the name named already exists, {}",
                &err
            ),
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
            }
        }
    }
}
