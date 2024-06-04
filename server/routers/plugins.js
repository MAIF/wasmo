const crypto = require('crypto')
const fetch = require('node-fetch');
const express = require('express');

const { unzip } = require('../utils');
const { Queue } = require('../services/queue');
const { FileSystem } = require('../services/file-system');

const { InformationsReader } = require('../services/informationsReader');
const { WebSocket } = require('../services/websocket');
const { ENV, STORAGE, AUTHENTICATION } = require('../configuration');
const Datastore = require('../datastores');

const router = express.Router()

router.post('/github', (req, res) => {
  const { owner, repo, ref, private } = req.body;

  fetch(`https://api.github.com/repos/${owner}/${repo}/zipball/${ref || "main"}`, {
    redirect: 'follow',
    headers: private ? {
      Authorization: `Bearer ${ENV.GITHUB_PERSONAL_TOKEN}`
    } : {}
  })
    .then(r => {
      const contentType = r.headers.get('Content-Type');
      const contentLength = r.headers.get('Content-Length');
      if (contentLength > ENV.GITHUB_MAX_REPO_SIZE) {
        return {
          status: 400,
          result: 'this repo exceed the limit of the manager'
        }
      } else if (contentType === 'application/zip') {
        r.headers.forEach((v, n) => res.setHeader(n, v));
        r.body.pipe(res);
      } else if (contentType === "application/json") {
        return r.json()
          .then(result => res.status(r.status).json(result));
      } else {
        return r.text()
          .then(result => res.status(r.status).json({ message: result }));
      }
    })
});

router.get('/', (req, res) => {
  Datastore.getUserPlugins(req.user.email)
    .then(data => res.json(data))
});

router.get('/:id', (req, res) => {
  Datastore.getSources(req.params.id)
    .then(out => {
      if (out.status === 200) {
        res.attachment('plugin.zip');
        res.send(out.body);
      } else {
        res
          .status(out.status)
          .json(out.body)
      }
    })
})

router.get('/:id/state', (req, res) => {
  Datastore.waitingTimeBeforeNextRun(req.params.id)
    .then(msTime => {
      if (msTime === null) {
        res.status(404)
      }
      res.json(msTime)
    });
})

router.get('/:id/configurations', (req, res) => {
  Datastore.getConfigurations(req.user.email, req.params.id)
    .then(data => res.json(data))
})

router.post('/github/repo', (req, res) => {
  fetch(`https://api.github.com/repos/${req.body.owner}/${req.body.repo}/branches/${req.body.ref || "main"}`, {
    redirect: 'follow',
    headers: req.body.private ? {
      Authorization: `Bearer ${ENV.GITHUB_PERSONAL_TOKEN}`
    } : {}
  })
    .then(r => {
      if (r.status === 200) {
        return Datastore.createEmptyPlugin(req.user.email, req.body, true);
      } else {
        if ((r.headers.get('Content-Type') === "application/json")) {
          return r.json()
            .then(result => ({ result, status: r.status }))
        } else {
          return r.text()
            .then(result => ({ result, status: r.status }))
        }
      }
    })
    .then(({ status, result }) => {
      res
        .status(status)
        .json({
          result, status
        })
    })
})

router.post('/', async (req, res) => {
  if (!req.body ||
    Object.keys(req.body).length === 0 ||
    (!req.body.metadata && !(req.body.plugin && req.body.type))) {
    return res.status(400).json({ error: 'missing body' });
  }

  const out = await Datastore.createEmptyPlugin(req.user.email, req.body.metadata || {
    name: req.body.plugin,
    type: req.body.type,
    template: req.body.template || 'empty'
  });

  if (out.status !== 201 || !req.body.files) {
    return res.status(out.status).json(out.body);
  } else {
    const templatesFiles = await FileSystem.templatesFilesToJSON(req.body.metadata.type, req.body.metadata.template || 'empty', req.body.metadata.name.replace(/ /g, '-'));
    const zip = await FileSystem.createZipFromJSONFiles(req.body.files, templatesFiles);
    const pluginId = out.body.plugins[out.body.plugins.length - 1].pluginId;
    Datastore.updatePlugin(pluginId, zip)
      .then(out => {
        if (out.status === 204) {
          res.status(201)
            .json({
              plugin_id: pluginId
            })
        } else {
          res.status(out.status)
            .json(out.body);
        }
      });
  }
})

router.put('/:id', (req, res) => {
  Datastore.updatePlugin(req.params.id, req.body)
    .then(out => {
      res.status(out.status).json(out.body);
    });
})

router.get('/:id/share-links', async (req, res) => {
  const plugins = await Datastore.getUserPlugins(req.user.email)

  const owner = plugins.find(plugin => plugin.pluginId === req.params.id)?.owner || req.user.email

  const hash = Buffer.from(`${owner}:${req.params.id}`).toString('base64')
  res.json(`${ENV.SECURE_DOMAIN ? 'https' : 'http'}://${ENV.DOMAIN}:${ENV.EXPOSED_PORT || ENV.PORT}/invitation/${hash}`)
})

router.put('/:id/users', (req, res) => {
  Datastore.patchPluginUsers(req.user.email,
    req.params.id,
    req.body.users,
    [...new Set([...req.body.admins, req.user.email])])
    .then(() => {
      res
        .status(204)
        .json(null)
    })
})

router.get('/:id/users', (req, res) => {
  Datastore.getPluginUsers(req.user.email, req.params.id)
    .then(members => res.status(200).json(members))
})

router.get('/:id/rights', (req, res) => {
  if (ENV.AUTH_MODE !== AUTHENTICATION.NO_AUTH) {
    Datastore.canSharePlugin(req.user.email, req.params.id)
      .then(canShare => {
        res
          .status(200)
          .json(canShare)
      })
  } else {
    return false
  }
})

router.delete('/:id', async (req, res) => {
  Datastore.deletePlugin(req.user.email, req.params.id)
    .then(out => {
      res.status(out.status).json(out.body)
    })
})

router.post('/build', async (req, res) => {
  const pluginId = crypto.randomUUID();

  const { metadata, files } = req.body;

  if (!metadata || !(metadata.type || req.body.kind)) {
    return res
      .status(400)
      .json({ error: "unknown plugin type" });
  }

  if (!files || files.length === 0) {
    return res
      .status(400)
      .json({ error: "missing files" });
  }

  const kind = metadata.type || req.body.kind;

  const isRustBuild = kind === 'rust';

  const zip = await fetch(`http://localhost:${ENV.PORT}/api/templates?type=${kind}&template=${metadata.template}`)
    .then(res => res.blob())
    .then(res => res.arrayBuffer());

  if (metadata.local !== undefined && !metadata.local && ![STORAGE.DOCKER_S3, STORAGE.S3].includes(ENV.STORAGE)) {
    return res
      .status(400)
      .json({ error: "metadata is not compatible with the storage used by Wasmo" });
  }

  FileSystem.createBuildFolder(kind, pluginId)
    .then(async folder => {
      const error = await unzip(isRustBuild,
        Buffer.from(zip),
        folder,
        [
          { key: '@@PLUGIN_NAME@@', value: metadata.name.replace(/ /g, '-') },
          { key: '@@PLUGIN_VERSION@@', value: metadata.version || '1.0.0' }
        ])

      if (error)
        return res.status(400).json({ error: 'failed to unzip file' });

      FileSystem.writeFiles(files, folder, isRustBuild)
        .then(() => {
          const saveInLocal = metadata.local !== undefined ? metadata.local : false;
          addPluginToBuildQueue(
            folder,
            {
              filename: metadata.name.replace(/ /g, '-'),
              type: kind,
              pluginId,
              last_hash: " ",
              versions: []
            },
            req.user ? req.user.email : 'admin@otoroshi.io',
            res,
            "zipHashToTest",
            metadata.release,
            saveInLocal,
            pluginId
          );
        });
    });
})

function addPluginToBuildQueue(folder, plugin, user, res, zipHash, release, saveInLocal, pluginId) {
  FileSystem.checkIfInformationsFileExists(folder, plugin.type)
    .then(() => InformationsReader.extractInformations(folder, plugin.type))
    .then(({ pluginName, pluginVersion, metadata, err }) => {
      if (err) {
        WebSocket.emitError(plugin.pluginId, release, err);
        Promise.all([
          Datastore.removeJob(pluginId),
          FileSystem.removeFolder('build', folder)
        ])
          .then(() => {
            res
              .status(400)
              .json({
                error: err
              });
          });
      } else {
        (plugin.type === 'opa' ? InformationsReader.extractOPAInformations(folder) : Promise.resolve(undefined))
          .then(opaMetadata => {
            const wasmName = `${pluginName}-${pluginVersion}${release ? '' : '-dev'}`;
            Datastore.isWasmExists(wasmName, release)
              .then(exists => {
                if (exists) {
                  Promise.all([
                    Datastore.removeJob(pluginId),
                    FileSystem.removeFolder('build', folder)
                  ])
                    .then(() => {
                      res
                        .status(400)
                        .json({
                          error: 'binary already exists'
                        });
                    });
                } else {
                  Queue.addBuildToQueue({
                    folder,
                    plugin: plugin.pluginId,
                    wasmName,
                    user,
                    zipHash,
                    isRustBuild: plugin.type === 'rust',
                    pluginType: plugin.type,
                    metadata: opaMetadata ? opaMetadata : (metadata ? metadata : {}),
                    release,
                    saveInLocal,
                    pluginName
                  });

                  res.json({
                    queue_id: folder
                  });
                }
              })
          })
          .catch(err => {
            WebSocket.emitError(plugin.pluginId, release, err)
            res
              .status(400)
              .json({
                error: err
              })
          })
      }
    })
    .catch(err => {
      WebSocket.emitError(plugin.pluginId, release, err);
      FileSystem.removeFolder('build', folder)
        .then(() => {
          res
            .status(400)
            .json({
              error: err
            });
        });
    });
}

router.post('/:id/build', async (req, res) => {
  const pluginId = req.params.id;
  const release = req.query.release === 'true';

  let user = req.user ? req.user.email : 'admin@otoroshi.io'

  const data = await Datastore.getUser(user)
  let plugin = (data.plugins || []).find(p => p.pluginId === pluginId);

  if (plugin?.owner) {
    user = plugin.owner;
    plugin = await Datastore.getPlugin(plugin.owner, pluginId);
  }

  if (plugin.type === 'github') {
    plugin.type = req.query.plugin_type;
  }

  const isRustBuild = plugin.type == 'rust';

  Queue.isJobRunning(pluginId)
    .then(async exists => {
      if (exists) {
        res.json({ queue_id: pluginId, alreadyExists: true });
      } else {
        const folder = await FileSystem.createBuildFolder(plugin.type, pluginId);

        let sources = req.body;
        if (!sources || Object.keys(sources).length === 0) {
          await Datastore.getSources(pluginId)
            .then(out => {
              if (out.status === 200) {
                sources = out.body;
              } else {
                res
                  .status(out.status)
                  .json(out.body)
              }
            })
        }

        await unzip(isRustBuild, sources, folder)
          .catch(() => res.status(400).json({ error: 'failed to unzip file' }));

        try {
          const zipHash = crypto
            .createHash('md5')
            .update(sources.toString())
            .digest('hex');

          if (release || plugin['last_hash'] !== zipHash || req.query.force) {
            addPluginToBuildQueue(
              folder,
              plugin,
              user,
              res,
              zipHash,
              release,
              undefined,
              pluginId)
          } else {
            FileSystem.removeFolder('build', folder)
              .then(() => {
                res.json({
                  message: 'no changes found'
                })
              })
          }
        } catch (err) {
          FileSystem.removeFolder('build', folder)
            .then(() => {
              res
                .status(400)
                .json({
                  error: 'Error reading toml file',
                  message: err.message
                })
            })
        }
      }
    })
})

router.patch('/:id/filename', (req, res) => {
  Datastore.patchPluginName(req.user.email, req.params.id, req.body.filename)
    .then(() => {
      res
        .status(204)
        .json(null)
    })
})

module.exports = router
