use assert_cmd::prelude::*;
use std::process::Command;

#[test]
fn file_doesnt_exist() -> Result<(), Box<dyn std::error::Error>> {
    let mut cmd = Command::cargo_bin("wasmo")?;

    cmd.args([
        "init",
        "--",
        "--template=js",
        "--name=foo-plugin",
        "--path=/tmp",
    ]);

    cmd.assert().success();

    Ok(())
}
