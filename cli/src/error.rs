use std::fmt;

pub type WasmoResult<T> = std::result::Result<T, WasmoError>;

#[derive(Debug, Clone)]
pub enum WasmoError {
    PluginAlreadyExists(String),
    PluginCreationFailed(String),
    MissingConfigurationFile(String),
}

impl fmt::Display for WasmoError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WasmoError::PluginAlreadyExists(err) => {
                write!(f, "a plugin with the name named already exists, {}", &err)
            }
            WasmoError::PluginCreationFailed(err) => {
                write!(f, "plugin failed to be create, {}", &err)
            }
            WasmoError::MissingConfigurationFile(err) => {
                write!(
                    f,
                    "failed to find and remove the configuration file, {}",
                    &err
                )
            }
        }
    }
}
