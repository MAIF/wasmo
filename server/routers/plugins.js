const crypto = require('crypto')
const fetch = require('node-fetch');
const express = require('express');

const { format, unzip } = require('../utils');

const { Queue } = require('../services/queue');
const { FileSystem } = require('../services/file-system');

const { InformationsReader } = require('../services/informationsReader');
const { WebSocket } = require('../services/websocket');
const { ENV, STORAGE } = require('../configuration');
const { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
    .then(res.json)
});

function getSources(pluginId) {
  const { s3, Bucket } = S3.state()

  const params = {
    Bucket,
    Key: `${pluginId}.zip`
  }

  return s3.send(new GetObjectCommand(params))
    .then(data => new fetch.Response(data.Body).buffer())
    .then(data => {
      return {
        status: 200,
        body: data
      }
    })
    .catch((err) => {
      return {
        status: err.$metadata.httpStatusCode,
        body: {
          error: err.Code,
          status: err.$metadata.httpStatusCode
        }
      }
    })
}

router.get('/:id', (req, res) => {
  getSources(req.params.id)
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

router.get('/:id/configurations', (req, res) => {
  const { s3, Bucket } = S3.state();

  UserManager.getUser(req)
    .then(data => {
      const plugin = data.plugins.find(f => f.pluginId === req.params.id)

      const files = [{
        ext: 'json',
        filename: 'config',
        readOnly: true,
        content: JSON.stringify({
          ...plugin
        }, null, 4)
      }]

      s3.send(new GetObjectCommand({
        Bucket,
        Key: `${plugin.pluginId}-logs.zip`
      }))
        .then(data => new fetch.Response(data.Body).buffer())
        .then(data => {
          res.json([
            ...files,
            {
              ext: 'zip',
              filename: 'logs',
              readOnly: true,
              content: data
            }
          ])
        })
        .catch(err => {
          res.json(files)
        })
    })
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
        return createPluginFromGithub(req);
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

function createPluginFromGithub(req) {
  const { s3, Bucket } = S3.state()

  const user = format(req.user.email)

  return new Promise(resolve => {
    UserManager.createUserIfNotExists(req.user.email)
      .then(() => UserManager.getUser(req))
      .then(data => {
        const pluginId = crypto.randomUUID()
        const plugins = [
          ...(data.plugins || []),
          {
            filename: req.body.repo,
            owner: req.body.owner,
            ref: req.body.ref,
            type: 'github',
            pluginId: pluginId,
            private: req.body.private
          }
        ]
        const params = {
          Bucket,
          Key: `${user}.json`,
          Body: JSON.stringify({
            ...data,
            plugins
          })
        }

        // create and add new plugin to the user
        s3.send(new PutObjectCommand(params))
          .then(() => resolve({ status: 201 }))
          .catch(err => {
            if (err) {
              resolve({
                status: err.$metadata.httpStatusCode,
                result: err.Code
              });
            }
            else {
              resolve({ status: 201 })
            }
          });
      });
  })
    .catch(err => {
      resolve({
        status: 404,
        result: err.message
      })
    });
}

function createEmptyPlugin(req, metadata) {
  const { s3, Bucket } = S3.state()

  const user = format(req.user.email)

  return new Promise(resolve => {
    UserManager.createUserIfNotExists(req.user.email)
      .then(() => {
        UserManager.getUser(req)
          .then(data => {
            const pluginId = crypto.randomUUID()
            const plugins = [
              ...(data.plugins || []),
              {
                filename: metadata.name.replace(/ /g, '-'),
                type: metadata.type,
                pluginId: pluginId
              }
            ]
            const params = {
              Bucket,
              Key: `${user}.json`,
              Body: JSON.stringify({
                ...data,
                plugins
              })
            }

            s3.send(new PutObjectCommand(params))
              .then(() => {
                resolve({
                  status: 201,
                  body: {
                    plugins
                  }
                })
              })
              .catch(err => {
                resolve({
                  status: err.$metadata.httpStatusCode,
                  body: {
                    error: err.Code,
                    status: err.$metadata.httpStatusCode
                  }
                })
              })
          })
      })
      .catch(err => {
        resolve({
          status: 400,
          body: {
            error: err.message
          }
        })
      })
  })
}

function updatePluginContent(id, body) {
  const { s3, Bucket } = S3.state();

  const params = {
    Bucket,
    Key: `${id}.zip`,
    Body: body
  }

  return s3.send(new PutObjectCommand(params))
    .then(() => ({
      status: 204,
      body: null
    }))
    .catch(err => {
      return {
        status: err.$metadata.httpStatusCode,
        body: {
          error: err.Code,
          status: err.$metadata.httpStatusCode
        }
      }
    })
}

router.post('/', async (req, res) => {
  if (!req.body ||
    Object.keys(req.body).length === 0 ||
    (!req.body.metadata && !(req.body.plugin && req.body.type))) {
    return res.status(400).json({ error: 'missing body' });
  }

  const out = await createEmptyPlugin(req, req.body.metadata || {
    name: req.body.plugin,
    type: req.body.type
  });

  if (out.status !== 201 || !req.body.files) {
    return res.status(out.status).json(out.body);
  } else {
    const templatesFiles = await FileSystem.templatesFilesToJSON(req.body.metadata.type, req.body.metadata.name.replace(/ /g, '-'));
    const zip = await FileSystem.createZipFromJSONFiles(req.body.files, templatesFiles);
    const pluginId = out.body.plugins[out.body.plugins.length - 1].pluginId;
    updatePluginContent(pluginId, zip)
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
  updatePluginContent(req.params.id, req.body)
    .then(out => {
      res.status(out.status).json(out.body);
    });
})

router.delete('/:id', async (req, res) => {
  const { s3, Bucket } = S3.state()

  const data = await UserManager.getUser(req);

  if (Object.keys(data).length > 0) {
    UserManager.updateUser(req.user.email, {
      ...data,
      plugins: data.plugins.filter(f => f.pluginId !== req.params.id)
    })
      .then(() => {
        const pluginHash = data.plugins
          .find(f => f.pluginId !== req.params.id) || {}
            .last_hash

        const params = {
          Bucket,
          Key: `${pluginHash}.zip`
        }

        s3.send(new DeleteObjectCommand(params))
          .then(() => res
            .status(204)
            .json(null))
          .catch(err => {
            res
              .status(err.$metadata.httpStatusCode)
              .json({
                error: err.Code,
                status: err.$metadata.httpStatusCode
              })
          })
      })
  } else {
    res
      .status(401)
      .json({
        error: 'invalid credentials'
      })
  }
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

  const zip = await fetch(`http://localhost:${ENV.PORT}/api/templates?type=${kind}`)
    .then(res => res.blob())
    .then(res => res.arrayBuffer())

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
            req,
            res,
            "zipHashToTest",
            metadata.release,
            saveInLocal
          );
        });
    });
})

function addPluginToBuildQueue(folder, plugin, req, res, zipHash, release, saveInLocal) {
  FileSystem.checkIfInformationsFileExists(folder, plugin.type)
    .then(() => InformationsReader.extractInformations(folder, plugin.type))
    .then(({ pluginName, pluginVersion, metadata, err }) => {
      if (err) {
        WebSocket.emitError(plugin.pluginId, release, err);
        FileSystem.removeFolder('build', folder)
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
            Queue.isBinaryExists(wasmName, release)
              .then(exists => {
                if (exists) {
                  FileSystem.removeFolder('build', folder)
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
                    user: req.user ? req.user.email : 'admin@otoroshi.io',
                    zipHash,
                    isRustBuild: plugin.type === 'rust',
                    pluginType: plugin.type,
                    metadata: opaMetadata ? opaMetadata : (metadata ? metadata : {}),
                    release,
                    saveInLocal
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

  const data = await UserManager.getUser(req)
  let plugin = (data.plugins || []).find(p => p.pluginId === pluginId);
  if (plugin.type === 'github') {
    plugin.type = req.query.plugin_type;
  }

  const isRustBuild = plugin.type == 'rust';

  Queue.isBuildRunning(pluginId)
    .then(async exists => {
      if (exists) {
        res.json({ queue_id: pluginId, alreadyExists: true });
      } else {
        const folder = await FileSystem.createBuildFolder(plugin.type, pluginId);

        let sources = req.body;
        if (!sources || Object.keys(sources).length === 0) {
          await getSources(pluginId)
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

          if (release || plugin['last_hash'] !== zipHash) {
            addPluginToBuildQueue(folder, plugin, req, res, zipHash, release)
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

  UserManager.getUser(req)
    .then(data => UserManager.updateUser(req.user.email, {
      ...data,
      plugins: (data.plugins || []).map(plugin => {
        if (plugin.pluginId === req.params.id) {
          return {
            ...plugin,
            filename: req.body.filename
          }
        } else {
          return plugin
        }
      })
    }))
    .then(() => {
      res
        .status(204)
        .json(null)
    })
})

module.exports = router
