const express = require('express');
const { ENV } = require('../configuration');
const Datastore = require('../datastores');

const router = express.Router()

router.get('/runtime', (_, res) => res.json(ENV.EXTISM_RUNTIME_ENVIRONMENT === 'true'));

router.get('/:id/exports', (req, res) => {
  Datastore.getWasm(req.params.id)
    .then(async ({ content, error, status }) => {
      if (error || status === 404) {
        res.status(status).json({ error, status })
      } else {
        try {
          const { newPlugin } = require('@extism/extism');

          // function proxy_log(cp, kOffs, vOffs) {
          //   const buffer = cp.read(kOffs)

          //   console.log({ kOffs, buffer, vOffs })

          //   return BigInt(0)
          // }

          const plugin = await newPlugin(new Uint8Array(content).buffer, {
            useWasi: true,
            // functions: {
            //   "extism:host/user": {
            //     proxy_log
            //   }
            // },
          });

          const exports = await plugin.getExports();

          await plugin.close()

          res.json(
            exports
              .filter(f => !["memory"].includes(f.name) && !f.name.startsWith("__"))
              .map(value => ({ value: value.name, label: value.name }))
          )
        } catch (err) {
          res.status(400).json({
            error: err.toString()
          })
        }
      }
    })
});

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
    if (!ENV.EXTISM_RUNTIME_ENVIRONMENT) {
      res
        .status(400)
        .json({
          error: 'Runtime environment is not enabled.'
        })
    } else {
      Datastore.run(req.params.pluginId, req.body, res)
        .then(out => res.status(out.status).json(out.body))
    }
  }
});

module.exports = router