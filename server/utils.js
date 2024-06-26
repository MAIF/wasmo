const AdmZip = require("adm-zip");
const fs = require("fs-extra");
const path = require("path");
const pako = require('pako');

// legacy
const format = value => {
  return value ? value.replace(/[^a-zA-Z ]/g, "") : "";
}

// legacy
const arrayIncludesEmail = (arr, email) => arr.includes(email) || arr.includes(format(email))

const isAString = variable => typeof variable === 'string' || variable instanceof String;

const unzip = (isRustBuild, zipString, outputFolder, rules = []) => {
  try {
    const zip = new AdmZip(zipString);
    const entries = zip.getEntries();

    return entries.reduce((p, entry) => p.then(() => new Promise(resolve => {
      try {
        const content = pako.inflateRaw(entry.getCompressedData(), { to: 'string' });

        if (!content)
          return resolve();

        let filePath = '';

        if (isRustBuild) {
          filePath = entry.entryName === 'Cargo.toml' ? '' : 'src';
        }

        const filenameParts = entry.entryName.split('/');
        const filename = filenameParts[filenameParts.length - 1];

        fs.writeFile(
          // path.join(process.cwd(), 'build', outputFolder, filePath, entry.entryName.split('/').slice(-1).join('/')),
          path.join(process.cwd(), 'build', outputFolder, filePath, filename),
          rules.reduce((acc, rule) => {
            return acc.replace(new RegExp(rule.key, "g"), rule.value)
          }, content)
        )
          .then(resolve)
      } catch (_) {
        resolve()
      }
    })), Promise.resolve())

  } catch (err) {
    Promise.resolve(err)
  }
}

const unzipTo = (zipString, outputPaths) => {
  const zip = new AdmZip(zipString);
  const entries = zip.getEntries();

  const folder = path.join(...outputPaths);
  return fs.mkdir(folder)
    .then(() => {
      return Promise.all(entries.map(entry => {
        try {
          const content = pako.inflateRaw(entry.getCompressedData(), { to: 'string' });

          return fs.writeFile(
            path.join(...outputPaths, entry.entryName),
            content
          )
        } catch (err) {
          return Promise.reject(err)
        }
      }))
        .then(() => folder)
    })
}

const INFORMATIONS_FILENAME = {
  go: "go.mod",
  rust: "Cargo.toml",
  js: "package.json",
  ts: "package.json",
  opa: "package.json"
};

module.exports = {
  format,
  arrayIncludesEmail,
  unzip,
  unzipTo,
  INFORMATIONS_FILENAME,
  isAString
}