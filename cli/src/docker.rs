use chrono;
use std::io::BufRead;
use std::io::BufReader;
use std::process::Command;
use std::process::Stdio;

use tokio::io::AsyncBufReadExt;

use crate::error::{WasmoError, WasmoResult};
use crate::port::get_available_port;
use crate::Host;

const WASMO_RUNNER: &str = "wasmo_runner";

pub struct Container {
    pub port: u16,
    pub name: String,
}

pub async fn docker_create(host: &Host) -> WasmoResult<Container> {
    crate::logger::loading(format!("<yellow>Check</> docker info"));

    let mut child = Command::new("docker")
        .args(["ps"])
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();

    let status = child.wait();

    match status {
        Ok(v) => {
            if !v.success() {
                let stdout = child.stdout.take().unwrap();
                let lines = BufReader::new(stdout).lines();
                for line in lines {
                    crate::logger::error(format!("{}", line.unwrap()));
                }
                Err(WasmoError::NoDockerRunning(
                    "Should be able to discuss with docker".to_string(),
                ))
            } else {
                let container_name = if host == &Host::Docker {
                    WASMO_RUNNER.to_string()
                } else {
                    chrono::offset::Utc::now().timestamp().to_string()
                };

                if host == &Host::OneShotDocker {
                    match run_docker_container(&container_name).await {
                        Ok(port) => Ok(Container {
                            port,
                            name: container_name,
                        }),
                        Err(e) => Err(e),
                    }
                } else {
                    let container_exists = check_if_docker_container_exists();

                    if !container_exists {
                        match run_docker_container(&container_name).await {
                            Ok(port) => Ok(Container {
                                port,
                                name: container_name,
                            }),
                            Err(e) => Err(e),
                        }
                    } else {
                        Ok(Container {
                            port: 5001,
                            name: container_name,
                        })
                    }
                }
            }
        }
        Err(err) => Err(WasmoError::DockerContainer(format!(
            "Should be able to discuss with docker, {}",
            err
        ))),
    }
}

pub async fn remove_docker_container(container_name: &String) -> bool {
    crate::logger::loading(format!("<yellow>Remove</> old docker container"));
    let mut child = Command::new("docker")
        .args(["rm", "-f", container_name])
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();

    let status = child.wait();

    match status {
        Err(err) => panic!(
            "Should be able to remove the existing wasmo container, {}",
            err
        ),
        Ok(v) => {
            crate::logger::success(format!("<green>Successfull cleaning</>"));
            v.success()
        }
    }
}

fn check_if_docker_container_exists() -> bool {
    let container_name = format!("name={}", WASMO_RUNNER);

    crate::logger::loading(format!(
        "<yellow>check</> the presence of the wasmo container"
    ));

    let mut child = Command::new("docker")
        .args(["ps", "-a", "-q", "-f", &container_name.as_str()])
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();

    let status = child.wait();

    match status {
        Err(err) => panic!("Should be able to get the list of containers, {}", err),
        Ok(v) => {
            if v.success() {
                let stdout = child.stdout.take().unwrap();
                let lines = BufReader::new(stdout).lines();

                lines.count() > 0
            } else {
                false
            }
        }
    }
}

async fn run_docker_container(container_name: &String) -> WasmoResult<u16> {
    crate::logger::indent_println("<yellow>Start</> wasmo container".to_string());

    crate::logger::indent_println("<yellow>Search</> an available TCP port".to_string());
    let res = match get_available_port() {
        Some(port) => {
            crate::logger::indent_println(format!("<yellow>Assign</> {} port", port));
            let mut child = Command::new("docker")
                .args([
                    "run",
                    "-d",
                    "--name",
                    container_name.as_str(),
                    "-p",
                    &format!("{}:5001", port),
                    "-e",
                    "MANAGER_PORT=5001",
                    "-e",
                    "AUTH_MODE=NO_AUTH",
                    "-e",
                    &format!("MANAGER_ALLOWED_DOMAINS=localhost:5001,localhost:{}", port),
                    "maif/wasmo",
                ])
                .stdout(Stdio::piped())
                .spawn()
                .expect("failed to spawn container");

            let status = child.wait();

            match status {
                Err(err) => Err(WasmoError::DockerContainer(format!(
                    "Should be able to run wasmo, {}",
                    err
                ))),
                Ok(_) => check_if_container_has_started(&container_name, port).await,
            }
        }
        None => Err(WasmoError::DockerContainer(
            "can't get an available port".to_owned(),
        )),
    };

    crate::logger::success(format!("<green>Wasmo container started </>"));

    res
}

async fn check_if_container_has_started(container_name: &String, port: u16) -> WasmoResult<u16> {
    let mut child = tokio::process::Command::new("docker")
        .args(["logs", "-f", container_name])
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn docker log");

    let stdout = child
        .stdout
        .take()
        .expect("child did not have a handle to stdout");

    let mut reader = tokio::io::BufReader::new(stdout).lines();

    let stop_condition = "listening on 5001";

    loop {
        let line = reader.next_line().await.unwrap().unwrap();

        // crate::logger::println(format!("{}", line));

        if line.contains(&stop_condition) {
            let _ = child.kill().await;
            break;
        }
    }

    Ok(port)
}
