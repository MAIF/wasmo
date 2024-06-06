const express = require('express');
const { ENV } = require('../configuration');
const { FileSystem } = require('../services/file-system');
const Datastore = require('../datastores');
const logger = require('../logger');

const router = express.Router()

const DOMAINS = (ENV.MANAGER_ALLOWED_DOMAINS || "").split(',');

const auth = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Credentials', true)
  next()
}

const forbiddenAccess = (req, res, next) => {
  logger.debug(`Received host: ${req.headers.host} - available domains: ${JSON.stringify(DOMAINS, null, 2)}`)
  res
    .status(403)
    .json({
      error: 'forbidden access'
    })
}

router.use((req, res, next) => {
  const checkDomain = ENV.CHECK_DOMAINS !== undefined ? ENV.CHECK_DOMAINS : true;

  if (checkDomain === 'false') {
    auth(req, res, next);
  } else if (DOMAINS.includes(req.headers.host)) {
    auth(req, res, next);
  } else {
    forbiddenAccess(req, res, next);
  }
});

router.get('/local/wasm/:id', (req, res) => {
  const id = req.params.id.endsWith('.wasm') ? req.params.id : `${req.params.id}.wasm`;

  FileSystem.getLocalWasm(id, res);
})

function getWasm(wasmId, res) {
  const id = wasmId.endsWith('.wasm') ? wasmId : `${wasmId}.wasm`;

  Datastore.getWasm(id)
    .then(({ content, error, status }) => {
      if (error) {
        res.status(status).json({ error, status })
      } else {
        res.attachment(id);
        res.send(content);
      }
    })
}

router.get('/wasm/:pluginId/:version', (req, res) => {
  getWasm(`${req.params.pluginId}-${req.params.version}.wasm`, res);
});

router.get('/wasm/:id', (req, res) => {
  getWasm(req.params.id, res);
});


router.get('/plugins', (req, res) => {
  const reg = req.headers['kind'] || '*';

  Datastore
    .getPlugins()
    .then(plugins => Promise.all(plugins.map(plugin => Datastore.getPlugin(reg, plugin.pluginId))))
    .then(plugins => res.json(plugins.filter(data => Object.keys(data).length > 0)))
});

module.exports = router;