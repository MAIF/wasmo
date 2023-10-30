<div align="center">
  <h1><code>wasmo</code></h1>

<strong>A <a href="https://github.com/MAIF/">MAIF</a> opensource project</strong>

  <p>
    <strong>Rust CLI to create and build WebAssembly modules</strong>
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

# Tools included

The `wasmo` binary internally contains a number of subcommands for working
with wasm modules:

| Tool                         | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `wasmo config set --token=<WASMO_TOKEN> --path=<CONFIGURATION_FILEPATH> --server=<SERVER_URL>`             |                                    |
| `wasmo config get`             |                                    |
| `wasmo config reset`             |                                    |
| `wasmo init --template=<js, go, opa, rust, ts> --name=<NAME> --pat=<PATH>`             |                                    |
| `wasmo build`             |                                    |


# License

This project is licensed under the Apache 2.0 license with the LLVM exception.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this project by you, as defined in the Apache-2.0 license,
shall be licensed as above, without any additional terms or conditions.