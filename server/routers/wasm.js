const express = require('express');
const { ENV } = require('../configuration');
const Datastore = require('../datastores');

const router = express.Router()

router.get('/runtime', (_, res) => res.json(ENV.EXTISM_RUNTIME_ENVIRONMENT === 'true'));

router.get('/:id', (req, res) => {
  const Key = `${req.params.id}.wasm`;

  Datastore.getWasm(Key)
    .then(({ content, error, status }) => {
      if (error || status === 404) {
        res.status(status).json({ error, status })
      } else {
        res.attachment(Key);
        res.send(content);
      }
    })
});

router.post('/:pluginId', (req, res) => {
  if (!req.params) {
    res
      .status(404)
      .json({
        error: 'Missing plugin id'
      })
  } else {
    const { pluginId } = req.params;

    Datastore.getUser(req.user.email)
      .then(data => {
        const plugin = data.plugins.find(plugin => plugin.pluginId === pluginId);

        if (!ENV.EXTISM_RUNTIME_ENVIRONMENT) {
          res
            .status(400)
            .json({
              error: 'Runtime environment is not enabled.'
            })
        } else if (plugin) {
          Datastore.run(plugin.wasm, req.body, res)
            .then(out => res.status(out.status).json(out.body))
        } else {
          res
            .status(404)
            .json({
              error: 'Plugin not found'
            })
        }
      })
  }
});

module.exports = router