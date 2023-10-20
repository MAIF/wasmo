use std::io::BufRead;
use std::io::BufReader;
use std::process::Command;
use std::process::Stdio;

use tokio::io::AsyncBufReadExt;

use paris::{error, info};

const WASMO_RUNNER: &str = "wasmo_runner";

pub async fn docker_create() {
    info!("Check docker info");

    let mut child = Command::new("docker")
        .args(["stats", "--no-stream"])
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
                panic!("Should be able to discuss with docker")
            } else {
                if check_if_docker_container_exists() {
                    if !remove_docker_container() {
                        panic!("Should be able to remove the existing wasmo container")
                    }
                }
                run_docker_container().await;
            }
        }
        Err(err) => panic!("Should be able to discuss with docker, {}", err),
    }
}

fn remove_docker_container() -> bool {
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

async fn run_docker_container() {
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
            "S3_ACCESS_KEY_ID=J11Q131JBRSOXFEOIHR8",
            "-e",
            "S3_SECRET_ACCESS_KEY=JYIcOAYq3CGAUDx4cup5yxljEtEvMYWHbTJggDDF",
            "-e",
            "S3_ENDPOINT=https://cellar-c2.services.clever-cloud.com",
            "-e",
            "S3_BUCKET=wasm-manager",
            // "maif/otoroshi-wasm-manager:16.9.2",
            "wasmo"
        ])
        .spawn()
        .expect("failed to spawn container");

    let status = child.wait();

    match status {
        Err(err) => panic!("Should be able to run wasmo, {}", err),
        Ok(_) => check_if_container_has_started().await,
    }
}

async fn check_if_container_has_started() {
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
}
