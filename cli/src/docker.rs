use std::io::BufRead;
use std::io::BufReader;
use std::process::Command;
use std::process::Stdio;

use tokio::io::AsyncBufReadExt;

use paris::{error, info};

use crate::error::{WasmoError, WasmoResult};

const WASMO_RUNNER: &str = "wasmo_runner";

pub async fn docker_create(one_shot_container: bool) -> WasmoResult<()> {
    info!("Check docker info");

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
                    error!("{}", line.unwrap());
                }
                Err(WasmoError::NoDockerRunning(
                    "Should be able to discuss with docker".to_string(),
                ))
            } else {
                let container_exists = check_if_docker_container_exists();
                if container_exists {
                    if !one_shot_container {
                        if !remove_docker_container() {
                            return Err(WasmoError::DockerContainer(
                                "Should be able to remove the existing wasmo container".to_string(),
                            ));
                        }
                    }
                }

                if !one_shot_container || container_exists {
                    run_docker_container().await
                } else {
                    Ok(())
                }
            }
        }
        Err(err) => Err(WasmoError::DockerContainer(format!(
            "Should be able to discuss with docker, {}",
            err
        ))),
    }
}

pub fn remove_docker_container() -> bool {
    info!("Remove old docker container");
    let mut child = Command::new("docker")
        .args(["rm", "-f", WASMO_RUNNER])
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
            info!("Successfull suppression");
            v.success()
        }
    }
}

fn check_if_docker_container_exists() -> bool {
    let container_name = format!("name={}", WASMO_RUNNER);

    info!("check the presence of the wasmo container");

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

async fn run_docker_container() -> WasmoResult<()> {
    info!("Start wasmo container");

    let mut child = Command::new("docker")
        .args([
            "run",
            "-d",
            "--name",
            WASMO_RUNNER,
            "-p",
            "5001:5001",
            "-e",
            "MANAGER_PORT=5001",
            "-e",
            "AUTH_MODE=NO_AUTH",
            "-e",
            "AWS_ACCESS_KEY_ID=J11Q131JBRSOXFEOIHR8",
            "-e",
            "AWS_SECRET_ACCESS_KEY=NCvEh1xRqZnsgc6y1qjUonr5K3CuLEGDUJxq3gDF",
            "-e",
            "S3_ENDPOINT=https://cellar-c2.services.clever-cloud.com",
            "-e",
            "S3_BUCKET=wasm-manager",
            "-e",
            "CLI_AUTHORIZATION=foobar",
            "maif/wasmo:0.1.1",
        ])
        .spawn()
        .expect("failed to spawn container");

    let status = child.wait();

    match status {
        Err(err) => Err(WasmoError::DockerContainer(format!(
            "Should be able to run wasmo, {}",
            err
        ))),
        Ok(_) => check_if_container_has_started().await,
    }
}

async fn check_if_container_has_started() -> WasmoResult<()> {
    let mut child = tokio::process::Command::new("docker")
        .args(["logs", "-f", WASMO_RUNNER])
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn docker log");

    let stdout = child
        .stdout
        .take()
        .expect("child did not have a handle to stdout");

    let mut reader = tokio::io::BufReader::new(stdout).lines();

    loop {
        let line = reader.next_line().await.unwrap().unwrap();

        info!("{}", line);

        if line.contains("listening on 5001") {
            let _ = child.kill().await;
            break;
        }
    }

    Ok(())
}
