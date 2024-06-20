const fetch = require('node-fetch');
const express = require('express');
const path = require('path');
const { FileSystem } = require('../services/file-system');
const { ENV } = require('../configuration');

const LANGUAGES_INDEX = {
  rust: 'lib.rs',
  js: 'index.js',
  ts: 'index.ts',
  go: 'main.go'
};

const router = express.Router()

router.get('/', (req, res) => {
  if (!req.query) {
    res
      .status(400)
      .json({
        error: 'Missing type of project'
      })
  } else {
    const { type, productTemplate } = req.query;
    // const template = !req.query.template || req.query.template === 'undefined' ? 'empty' : req.query.template;

    if (['rust', 'js', 'go', 'ts'].includes(type)) {
      const path = `templates/otoroshi/${productTemplate}/${LANGUAGES_INDEX[type]}`

      getTemplates(path, res);
    } else {
      res
        .status(404)
        .json({
          error: 'No template for this type of project'
        })
    }
  }
});

function getTemplatesFromPath(type, template, res) {
  if (template !== 'empty')
    return res.sendFile(path.join(__dirname, '../templates', template, `${type}.zip`))
  else
    return res.sendFile(path.join(__dirname, '../templates', `${type}.zip`))
}

function getTemplates(path, res) {
  const source = ENV.MANAGER_TEMPLATES;

  if (!source) {
    return getTemplatesFromPath(path, res);
  } else if (source.startsWith('file://')) {
    const paths = [path]

    FileSystem.existsFile(...paths)
      .then(() => {
        res.download(FileSystem.pathsToPath(...paths), 'data')
      })
      .catch(err => {
        res
          .status(400)
          .json({ error: err })
      })
  } else if (source.startsWith('http')) {
    fetch(`${source}/${path}`, {
      redirect: 'follow'
    })
      .then(r => r.json())
      .then(r => {
        fetch(r.download_url)
          .then(raw => raw.body.pipe(res))
      })
  } else {
    res
      .status(404)
      .json({
        error: 'No template for this type of project'
      })
  }
}

module.exports = router