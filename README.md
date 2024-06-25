<p align="center">
  <img src="https://github.com/MAIF/wasmo/assets/6641669/fe3295dc-0c0b-41dd-a620-777e1108c4f3" alt="wasmo" width="300" style="margin: auto"/>
</p>

# Wasmo

<p align="center">
<img width="1000" alt="Screenshot 2024-06-25 at 16 16 48" src="https://github.com/MAIF/wasmo/assets/6641669/6df99140-a9c3-462b-b906-dc9cfa088f8d">
</p>

<p align="center">
<img width="1000" alt="Screenshot 2024-06-25 at 16 15 05" src="https://github.com/MAIF/wasmo/assets/6641669/b9ca8410-f1e1-456a-924e-05a6c2d7d243">
</p>


Wasmo can be deploy from the Docker using [the built images](https://hub.docker.com/r/maif/wasmo).

It comes with a server part to create and build your WASM plugin and a frontend to edit your plugins directly in the integrated UI.

[Documentation](https://maif.github.io/wasmo)

## Articles : examples and enterprise use cases

Wasmo plugins can be used :
  - With the reverse proxy [Otoroshi](https://www.otoroshi.io/)
    - [Wasm usage](https://maif.github.io/otoroshi/manual/how-to-s/wasm-usage.html)
    - [Wasmo and Otoroshi](https://maif.github.io/otoroshi/manual/how-to-s/wasmo-installation.html)
    - [Build plugins to manipulate http requests](https://zwiterrion.hashnode.dev/leveraging-wasm-for-api-gateway) 
 
  - To build FAAS [Function As a Service](https://zwiterrion.hashnode.dev/building-your-first-faas-with-wasm)
  - To control [Feature flags](https://maif.github.io/izanami/docs/guides/local-scripts?_highlight=wasmo#creating-your-script-with-wasmo-cli) with [Izanami](https://maif.github.io/izanami/)

# Wasmo CLI

Found more information [here](https://github.com/MAIF/wasmo/tree/main/cli)

# License

This project is licensed under the Apache 2.0 license with the LLVM exception.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this project by you, as defined in the Apache-2.0 license,
shall be licensed as above, without any additional terms or conditions.
