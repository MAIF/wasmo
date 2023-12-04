const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const manager = require('../../logger');
const { WebSocket } = require('../../services/websocket');
const { FileSystem } = require('../file-system');
const { optimizeBinaryFile } = require('../wasmgc');
const Datastore = require('../../datastores/api');

const Datastore = require('../../datastores');

const COMMAND_DELIMITER = " ";
const BUILD_FOLDER_NAME = "build";
const LOGS = {
  FOLDER_NAME: "logs",
  STDOUT_FILE: "stdout.log",
  STDERR_FILE: "stderr.log"
};

class CompilerOptions {
  constructor({ wasmName, entrypoint, wasi }) {
    this.wasi = wasi;
    this.wasmName = wasmName;
    this.opa = {
      entrypoint
    }
  }
}

class BuildOptions {
  constructor({
    folderPath,
    pluginId,
    userEmail,
    pluginZipHash,
    pluginType,
    metadata,
    isReleaseBuild,
    wasi,
    saveInLocal
  }) {
    this.folderPath = folderPath;
    this.userEmail = userEmail;
    this.plugin = {
      id: pluginId,
      type: pluginType,
      hash: pluginZipHash
    };
    this.metadata = metadata;
    this.isReleaseBuild = isReleaseBuild;
    this.wasi = wasi;
    this.saveInLocal = saveInLocal;
  }
}

class Compiler {
  constructor({ name, commands, options, outputWasmFolder }) {
    this.log = manager.createLogger(`[${name} BUILDER]`);
    this.options = options;

    this.commands = this.splitCommands(commands);
    this.outputWasmFolder = outputWasmFolder || (buildOptions => path.join(buildOptions.buildFolder, `${this.options.wasmName}.wasm`))
  }

  splitCommands = commands => {
    return commands.map(rawCommand => {
      let command = rawCommand;
      if (typeof command === 'function')
        command = rawCommand(this.options)

      const parts = command.split(COMMAND_DELIMITER);
      const executable = parts[0];
      const args = parts.slice(1);

      return { executable, args }
    })
  }

  #createLogsFolder(buildOptions) {
    return fs.pathExists(buildOptions.logsFolder)
      .then(exists => exists ? Promise.resolve() : fs.mkdir(buildOptions.logsFolder))
  }

  #createLogStreams(buildOptions) {
    return {
      stdoutStream: FileSystem.createFolderAtPath(path.join(buildOptions.logsFolder, LOGS.STDOUT_FILE)),
      stderrStream: FileSystem.createFolderAtPath(path.join(buildOptions.logsFolder, LOGS.STDERR_FILE))
    }
  }

  #websocketEmitMessage(buildOptions, message, isError = false) {
    const { isReleaseBuild, plugin } = buildOptions;
    const pluginId = plugin.id;

    if (isError) {
      WebSocket.emitError(pluginId, isReleaseBuild, message);
    } else {
      WebSocket.emit(pluginId, isReleaseBuild, message);
    }
  }

  #attachListeners = (child, buildOptions) => {
    const { stdoutStream, stderrStream } = buildOptions.logStreams;

    child.stdout.on('data', data => {
      this.#websocketEmitMessage(buildOptions, data);
      stdoutStream.write(data);
    });

    child.stderr.on('data', data => {
      this.#websocketEmitMessage(buildOptions, data);
      stderrStream.write(data);
    });

    child.on('error', (error) => {
      console.log(error)
      this.#websocketEmitMessage(buildOptions, error, true);
      stderrStream.write(`${error.stack}\n`);
    });
  }

  #handleCloseEvent = (buildOptions, closeCode, isLastCommand, { justToNext, onAllSuccess, onChildFailure }) => {
    const childProcessHasFailed = closeCode !== 0;

    if (childProcessHasFailed) {
      this.#handleChildFailure([buildOptions.buildFolder, buildOptions.logsFolder], closeCode, onChildFailure);
    } else if (isLastCommand) {
      this.#websocketEmitMessage(buildOptions, "Build done.");
      this.#onSuccess(buildOptions, {
        callback: onAllSuccess,
        handleFailure: onChildFailure
      });
    } else {
      justToNext();
    }
  }

  #onSuccess = (buildOptions, { callback, handleFailure }) => {
    this.#websocketEmitMessage(buildOptions, "Starting package ...");

    optimizeBinaryFile(
      this.options,
      buildOptions,
      this.outputWasmFolder(buildOptions),
      (message, onError = false) => this.#websocketEmitMessage(buildOptions, message, onError)
    )
      .then(outputFilepath => {
        return (buildOptions.saveInLocal ?
          FileSystem.storeWasm(outputFilepath) :
          Promise.all([
            Datastore.putWasmFileToS3(outputFilepath)
              .then(() => this.#websocketEmitMessage(buildOptions, "WASM has been saved ...")),
            Datastore.putBuildLogsToS3(`${buildOptions.plugin.id}-logs.zip`, buildOptions.logsFolder)
              .then(() => this.#websocketEmitMessage(buildOptions, "Logs has been saved ...")),
            Datastore.putWasmInformationsToS3(buildOptions.userEmail, buildOptions.plugin.id, buildOptions.plugin.hash, `${this.options.wasmName}.wasm`)
              .then(() => this.#websocketEmitMessage(buildOptions, "Informations has been updated"))
          ]))
          .then(() => {
            FileSystem.cleanFolders(buildOptions.buildFolder, buildOptions.logsFolder)
              .then(callback)
          })
      })
      .catch(err => {
        this.log.error(`Build failed: ${err}`)
        this.#websocketEmitMessage(buildOptions, err, true);
        this.#handleChildFailure([buildOptions.buildFolder, buildOptions.logsFolder], -1, handleFailure)
      });
  }

  #handleChildFailure = (folders, errorCode, reject) => {
    FileSystem.cleanFolders(...folders)
      .then(() => reject(errorCode))
  }

  build(rawBuildOptions) {
    const buildOptions = { ...rawBuildOptions };
    this.log.info(`Starting build ${buildOptions.folderPath}`)

    const root = process.cwd();

    buildOptions.buildFolder = path.join(root, BUILD_FOLDER_NAME, buildOptions.folderPath);
    buildOptions.logsFolder = path.join(root, LOGS.FOLDER_NAME, buildOptions.folderPath);

    return this.#createLogsFolder(buildOptions)
      .then(() => {
        return new Promise((onAllSuccess, onChildFailure) => {
          buildOptions.logStreams = this.#createLogStreams(buildOptions);

          this.#websocketEmitMessage(buildOptions, 'Starting build ...');

          return this.commands
            .reduce((promise, fn, index) => promise.then(() => new Promise(justToNext => {
              const { executable, args } = fn;

              this.#websocketEmitMessage(buildOptions, `Running command ${executable} ${args.join(' ')} ...`);

              const childProcess = spawn(executable, args, { cwd: buildOptions.buildFolder });
              childProcess.on('close', code => this.#handleCloseEvent(
                buildOptions,
                code,
                this.commands.length - 1 === index,
                { justToNext, onAllSuccess, onChildFailure },
              ));

              this.#attachListeners(childProcess, buildOptions);
            })), Promise.resolve())
            .then()
        })
      })
  }
}

module.exports = {
  Compiler,
  CompilerOptions,
  BuildOptions
}