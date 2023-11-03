<div align="center">
  <h1><code>wasmo</code></h1>

<strong>A <a href="https://github.com/MAIF/">MAIF</a> opensource project</strong>

  <p>
    <strong>Wasmo CLI brings WASM to your architecture</strong>
  </p>

  <p>
  Wasmo CLI can be combined with the power of <a href="https://hub.docker.com/r/maif/wasmo">Docker Wasmo server images</a> to build locally and remotly WASM binaries.
  </p>
</div>


# Installation

This project can be installed and compiled from source with this Cargo command:

```
$ cargo install wasmo
```

Additionally there are [precompiled artifacts built on CI][artifacts] which are
available for download as well.

[artifacts]: https://github.com/MAIF/wasmo/releases

Installation can be confirmed with:

```
$ wasmo --version
```

Subcommands can be explored with:

```
$ wasmo help
```

# Core commands

The `wasmo` CLI internally contains a number of subcommands for working
with wasm modules:

| Tool                        | Arguments | Description                                                   |
| ---------------------------- | -- | ------------------------------------------------------------- |
| `wasmo config set`            | token &#124; path &#124; server | Globally configure the CLI with the authorization token, the path where the configuration file will be stored and the server to reach during the build. These parameters are optional and can be passed when running the build command.  |
| `wasmo config get`         |    | Get the configuration from the configured path file or from `$HOME/.wasmo` |
| `wasmo config reset`        |     | Clean configuration and reset to default settings. The default file path configuration will be `$HOME/.wasmo`                                   ||
| `wasmo init`             | template &#124; name &#124; path | Initialize a WASM plugin to the specific path. You can choose between many templates, javascript/typescript (js/ts), Open Policy Agent (opa), Rust or Golang (go). |
| `wasmo build`             | path &#124; provider &#124; server &#124; token | Build the plugin  by sending the contents to the remote or local Wasmo server. As soon as the build is complete, the WASM binary is donwloaded and saved in the plugin folder. |

# License

This project is licensed under the Apache 2.0 license with the LLVM exception.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this project by you, as defined in the Apache-2.0 license,
shall be licensed as above, without any additional terms or conditions.