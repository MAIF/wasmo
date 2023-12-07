const fs = require('fs-extra');
const path = require('path');
const { INFORMATIONS_FILENAME } = require('../utils');
const AdmZip = require('adm-zip');
const logger = require('../logger');

const createBuildFolder = (type, name) => {
  if (['rust', 'js', 'ts'].includes(type)) {
    return new Promise(resolve => {
      fs.copy(
        path.join(process.cwd(), 'templates', 'builds', type),
        path.join(process.cwd(), 'build', name),
        err => {
          if (err) {
            logger.error('An error occured while copying the folder.')
            throw err
          }
          resolve(name)
        }
      )
    })
  } else {
    return fs
      .mkdir(path.join(process.cwd(), 'build', name))
      .then(() => name)
  }
}

const cleanFolders = (...folders) => {
  return Promise.all(folders.map(folder => {
    try {
      return fs.remove(folder)
    } catch (err) {
      return Promise.resolve(err)
    }
  }))
}

const removeFolder = (...paths) => fs.remove(path.join(process.cwd(), ...paths));

const createFolderAtPath = (path) => fs.createWriteStream(path, { flags: 'w+' });

const buildFolderAlreadyExits = (...paths) => fs.pathExists(path.join(process.cwd(), ...paths));

const folderAlreadyExits = (...paths) => fs.pathExists(path.join(...paths));

const cleanBuildsAndLogsFolders = async () => {
  return Promise.all([
    path.join(process.cwd(), "build"),
    path.join(process.cwd(), "logs"),
  ].map((folder, i) => {
    return fs.readdir(folder, async (_, files) => {
      const deletedFiles = (files || []).filter(file => !file.startsWith('.'));

      const out = await Promise.all(deletedFiles.map(async file => {
        const filepath = path.join(process.cwd(), i === 0 ? "build" : "logs", file)
        if (Date.now() - (await fs.stat(filepath)).birthtimeMs > 120000)
          return filepath
        return undefined
      })).then(data => data.filter(f => f))

      return cleanFolders(...out);
    });
  }))
}

const checkIfInformationsFileExists = (folder, pluginType) => {
  return existsFile('build', folder, INFORMATIONS_FILENAME[pluginType]);
}

const existsFile = (...paths) => {
  return new Promise((resolve, reject) => {
    fs.stat(path.join(process.cwd(), ...paths), function (err, stat) {
      if (err == null) {
        resolve();
      } else if (err.Code === 'ENOENT') {
        reject("file does not exist");
      } else {
        reject(err);
      }
    });
  });
}

const pathsToPath = (...paths) => path.join(process.cwd(), ...paths);

const writeFiles = (files, folder, isRustBuild) => {
  return Promise.all(files.map(({ name, content }) => {
    const filePath = isRustBuild ? (name === 'Cargo.toml' ? '' : 'src') : '';

    return fs.writeFile(
      path.join(process.cwd(), 'build', folder, filePath, name),
      content
    )
  }));
}


const storeWasm = fromFolder => {
  return fs.move(fromFolder, pathsToPath(`/wasm/${fromFolder.split('/').slice(-1)[0]}.wasm`))
};

const getLocalWasm = (id, res) => {
  fs.readFile(path.join(process.cwd(), "wasm", id))
    .then(file => res.send(file))
    .catch(() => {
      res.status(404)
        .json({ error: "file not found" });
    })
}

const createZipFromJSONFiles = (jsonFiles, templatesFiles) => {
  const zip = new AdmZip();
  [
    ...templatesFiles.filter(t => !jsonFiles.find(f => f.name === t.name)),
    ...jsonFiles].forEach(({ name, content }) => {
      zip.addFile(name, content)
    })

  return zip.toBuffer()
}

const templatesFilesToJSON = (type, name) => {
  const folder = path.join(process.cwd(), 'templates', `${type}.zip`);

  const zip = new AdmZip(folder);

  return zip.getEntries()
    .map(entry => ({
      name: entry.entryName.replace(`${type}/`, ''),
      content: entry.getData().toString('utf-8')
        .replace('@@PLUGIN_NAME@@', name)
        .replace('@@PLUGIN_VERSION@@', '1.0.0')
    }))

}

module.exports = {
  FileSystem: {
    writeFiles,
    createBuildFolder,
    createFolderAtPath,
    cleanFolders,
    folderAlreadyExits,
    buildFolderAlreadyExits,
    removeFolder,
    cleanBuildsAndLogsFolders,
    checkIfInformationsFileExists,
    existsFile,
    pathsToPath,
    storeWasm,
    getLocalWasm,
    createZipFromJSONFiles,
    templatesFilesToJSON
  }
}