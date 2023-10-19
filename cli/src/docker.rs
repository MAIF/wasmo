use std::io::BufRead;
use std::io::BufReader;
use std::process::Command;
use std::process::Stdio;

use paris::info;

pub fn docker_create() {
    info!("Check docker info");

    let mut child = Command::new("docker")
        .args(["stats", "--no-stream"])
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();

    let stdout = child.stdout.take().unwrap();

    let lines = BufReader::new(stdout).lines();
    for line in lines {
        println!("{}", line.unwrap());
    }

    match child.wait() {
        Ok(v) => {
            if !v.success() {
                panic!("Should be able to discuss with docker")
            }
        },
        Err(err) => panic!("Should be able to discuss with docker, {}", err),
    }
}
