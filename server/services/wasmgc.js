const { exec } = require('child_process');
const fs = require('fs-extra');
const p = require('path');

function wasmgc(options, buildOptions, path, log) {
  let outputFilepath = p.join(path.split("/").slice(0, -1).join("/"), options.wasmName);

  if (!outputFilepath.endsWith('.wasm'))
    outputFilepath = `${outputFilepath}.wasm`

  const command = {
    executable: 'wasm-opt',
    args: ['-O', outputFilepath, '-o', outputFilepath]
  }

  return new Promise((resolve) => {
    exec(`mv ${path} ${outputFilepath}`, (error) => {
      if (error) {
        exec(`mv ${p.join(path.split("/").slice(0, -1).join("/"), buildOptions.pluginName.replace('-', '_'))}.wasm ${outputFilepath}`, () => {
          optimizeFile(outputFilepath, command, log, resolve)
        })
      } else {
        optimizeFile(outputFilepath, command, log, resolve)
      }
    });
  });
}

function optimizeFile(outputFilepath, command, log, resolve) {
  return getFileSize(outputFilepath)
    .then(originalSize => {
      log(`File size before optimizing: ${originalSize} bytes`)
      log(`${command.executable} ${command.args.join(" ")}`);
      exec(`${command.executable} ${command.args.join(" ")}`, (error, stdout, stderr) => {
        if (error) {
          log(error.message, true);
          return resolve(outputFilepath);
        }
        if (stderr) {
          log(stderr, true);
          return resolve(outputFilepath);
        }

        getFileSize(outputFilepath)
          .then(newSize => {
            log(`File size after optimizing: ${newSize} bytes - ${(1 - (newSize / originalSize)) * 100}%`)

            resolve(outputFilepath);
          });
      });
    });
}

function getFileSize(path) {
  return new Promise(resolve => {
    fs.stat(path, (_, stats) => {
      resolve(stats?.size || 1)
    })
  })
}

module.exports = {
  optimizeBinaryFile: wasmgc
}