const express = require('express');
const { format } = require('../utils');
const { ENV } = require('../configuration');
const { FileSystem } = require('../services/file-system');
const Datastore = require('../datastores');

const router = express.Router()

const DOMAINS = (ENV.MANAGER_ALLOWED_DOMAINS || "").split(',');

const auth = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Credentials', true)
  next()
}

const forbiddenAccess = (req, res, next) => {
  console.log(DOMAINS.includes(req.headers.host))
  console.log(req.headers.host)
  console.log(DOMAINS)
  res
    .status(403)
    .json({
      error: 'forbidden access'
    })
}

router.use((req, res, next) => {
  if (DOMAINS.includes(req.headers.host)) {
    auth(req, res, next);
  } else {
    forbiddenAccess(req, res, next);
  }
});

router.get('/local/wasm/:id', (req, res) => {
  FileSystem.getLocalWasm(`${req.params.id}.wasm`, res)
})

function getWasm(wasmId, res) {
  Datastore.getWasm(wasmId)
    .then(({ content, error, status }) => {
      if (error) {
        res.status(status).json({ error, status })
      } else {
        res.attachment(Key);
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

  if (reg === '*') {
    Datastore.getUsers()
      .then(r => {
        const users = [...new Set([...(r || []), "adminotoroshiio"])];

        if (users.length > 0) {
          Promise.all(users.map(Datastore.getUser))
            .then(pluginsByUser => {
              res.json(pluginsByUser
                .map(user => user.plugins)
                .flat())
            })
        } else {
          res.json([])
        }
      })
  } else {
    Datastore.getUser(format(reg))
      .then(data => res.json(data.plugins))
  }
});

module.exports = router;