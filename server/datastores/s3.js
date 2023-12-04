const crypto = require('crypto')
const { GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
    S3Client,
    HeadBucketCommand,
    CreateBucketCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const fetch = require('node-fetch');
const dns = require('dns');
const url = require('url');
const fs = require('fs-extra');

const { format, isAString } = require('../utils');
const Datastore = require('./api');
const { ENV, STORAGE } = require("../configuration");
const manager = require("../logger");
const consumers = require('node:stream/consumers');
const AdmZip = require("adm-zip");

const log = manager.createLogger('S3');

/**
 * Class representing S3.
 * @extends Datastore
 */
module.exports = class S3Datastore extends Datastore {
    #state = {
        instance: undefined,
        Bucket: undefined
    }

    #createBucketIfMissing = () => {
        const params = { Bucket: this.#state.Bucket }

        return this.#state.instance.send(new HeadBucketCommand(params))
            .then(() => log.info("Using existing bucket"))
            .catch(res => {
                if (res.$metadata.httpStatusCode === 404 ||
                    res.$metadata.httpStatusCode === 403 ||
                    res.$metadata.httpStatusCode === 400) {
                    log.error(`Bucket ${this.#state.Bucket} is missing.`)
                    return new Promise(resolve => {
                        this.#state.instance.send(new CreateBucketCommand(params), err => {
                            if (err) {
                                console.log(err)
                                throw err;
                            } else {
                                log.info(`Bucket ${this.#state.Bucket} created.`)
                                resolve()
                            }
                        });
                    })
                } else {
                    return res
                }
            })
    }

    initialize = async () => {
        if (!ENV.S3_BUCKET) {
            console.log("[S3 INITIALIZATION](failed): S3 Bucket is missing");
            process.exit(1);
        }

        log.info("Initialize s3 client");
        let initializeClient;
        if (ENV.STORAGE === STORAGE.DOCKER_S3) {
            const URL = url.parse(ENV.S3_ENDPOINT)
            initializeClient = new Promise(resolve => dns.lookup(URL.hostname, function (err, ip) {
                log.debug(`${URL.protocol}//${ip}:${URL.port}${URL.pathname}`)
                this.#state = {
                    instance: new S3Client({
                        region: ENV.AWS_DEFAULT_REGION,
                        endpoint: `${URL.protocol}//${ip}:${URL.port}${URL.pathname}`,
                        forcePathStyle: ENV.S3_FORCE_PATH_STYLE
                    }),
                    Bucket: ENV.S3_BUCKET
                }
                resolve()
            }))
        } else {
            this.#state = {
                instance: new S3Client({
                    region: ENV.AWS_DEFAULT_REGION,
                    endpoint: ENV.S3_ENDPOINT,
                    forcePathStyle: ENV.S3_FORCE_PATH_STYLE,
                }),
                Bucket: ENV.S3_BUCKET
            }

            log.info("S3 Bucket initialized");
            initializeClient = Promise.resolve();
        }

        return initializeClient
            .then(this.#createBucketIfMissing)
    }

    getUser = (email) => {
        const { instance, Bucket } = this.#state;

        return new Promise(resolve => {
            instance.send(new GetObjectCommand({
                Bucket,
                Key: `${format(email)}.json`
            }))
                .then(data => {
                    try {
                        if (data && data.Body) {
                            consumers.json(data.Body)
                                .then(resolve)
                        }
                        else
                            resolve({})
                    } catch (err) {
                        log.error(err)
                        resolve({})
                    }
                })
                .catch(err => {
                    log.error(err)
                    resolve({})
                })
        })
    }

    getUserPlugins = (email) => {
        return this.getUser(email)
            .then(data => data.plugins || [])
    }

    #addUser = (email) => {
        const { instance, Bucket } = this.#state;

        return new Promise((resolve, reject) => {
            instance.send(new GetObjectCommand({
                Bucket,
                Key: 'users.json'
            }))
                .then(data => {
                    let users = []
                    try {
                        users = JSON.parse(data.Body.toString('utf-8'))
                    } catch (err) { }

                    instance.send(new PutObjectCommand({
                        Bucket,
                        Key: 'users.json',
                        Body: JSON.stringify([
                            ...users,
                            email
                        ])
                    }))
                        .then(resolve)
                })
                .catch(err => {
                    if (err.Code === "NoSuchKey") {
                        instance.send(new PutObjectCommand({
                            Bucket,
                            Key: 'users.json',
                            Body: JSON.stringify([email])
                        }))
                            .then(resolve)
                    } else {
                        reject(err)
                    }
                })
        })
    }

    createUserIfNotExists = (email) => {
        const { instance, Bucket } = this.#state;;

        return new Promise((resolve, reject) => instance.send(new HeadObjectCommand({
            Bucket,
            Key: `${format(email)}.json`
        }))
            .then(() => resolve(true))
            .catch(err => {
                if (err) {
                    if (err.$metadata.httpStatusCode === 404) {
                        this.#addUser(format(email))
                            .then(resolve)
                            .catch(reject)
                    } else {
                        reject(err)
                    }
                } else {
                    resolve(true)
                }
            }))
    }

    getUsers = () => {
        const { instance, Bucket } = this.#state;

        return instance.send(new GetObjectCommand({
            Bucket,
            Key: 'users.json'
        }))
            .then(data => new fetch.Response(data.Body).json())
            .catch(err => console.log(err))
    }

    updateUser = (email, content) => {
        const { instance, Bucket } = this.#state;

        const jsonProfile = format(email);

        return new Promise(resolve => {
            instance.send(new PutObjectCommand({
                Bucket,
                Key: `${jsonProfile}.json`,
                Body: JSON.stringify(content)
            }))
                .then(_ => resolve({
                    status: 200
                }))
                .catch(err => {
                    resolve({
                        error: err.Code,
                        status: err.$metadata.httpStatusCode
                    })
                })
        })
    }

    putWasmFileToS3 = (wasmFolder) => {
        const { instance, Bucket } = this.#state;

        const Key = wasmFolder.split('/').slice(-1)[0]

        return new Promise((resolve, reject) => {
            fs.readFile(wasmFolder, (err, data) => {
                if (err)
                    reject(err)
                else
                    instance.send(new PutObjectCommand({
                        Bucket,
                        Key: Key.endsWith(".wasm") ? Key : `${Key}.wasm`,
                        Body: data
                    }))
                        .then(resolve)
                        .catch(reject)
            })
        })
    }

    putBuildLogsToS3 = (logId, logsFolder) => {
        const { instance, Bucket } = this.#state;

        const zip = new AdmZip()
        zip.addLocalFolder(logsFolder, 'logs')

        return new Promise((resolve, reject) => {
            instance.send(new PutObjectCommand({
                Bucket,
                Key: logId,
                Body: zip.toBuffer()
            }))
                .then(resolve)
                .catch(reject)
        })
    }

    putWasmInformationsToS3 = (email, pluginId, newHash, generateWasmName) => {
        return this.getUser(email)
            .then(data => {
                const newPlugins = data.plugins.map(plugin => {
                    if (plugin.pluginId !== pluginId) {
                        return plugin;
                    }
                    let versions = plugin.versions || [];

                    // convert legacy array
                    if (versions.length > 0 && isAString(versions[0])) {
                        versions = versions.map(name => ({ name }))
                    }

                    const index = versions.findIndex(item => item.name === generateWasmName);
                    if (index === -1)
                        versions.push({
                            name: generateWasmName,
                            updated_at: Date.now(),
                            creator: email
                        })
                    else {
                        versions[index] = {
                            ...versions[index],
                            updated_at: Date.now(),
                            creator: email
                        }
                    }

                    return {
                        ...plugin,
                        last_hash: newHash,
                        wasm: generateWasmName,
                        versions
                    }
                });
                return this.updateUser(email, {
                    ...data,
                    plugins: newPlugins
                })
            })
    }

    getWasm = (wasmId) => {
        const { instance, Bucket } = this.#state;

        return new Promise(resolve => {
            instance.send(new GetObjectCommand({
                Bucket,
                wasmId
            }))
                .then(data => new fetch.Response(data.Body).buffer())
                .then(data => {
                    resolve({ content: data });
                })
                .catch(err => {
                    resolve({
                        error: err.Code,
                        status: err.$metadata.httpStatusCode
                    })
                });
        });
    }

    run = (wasm, { input, functionName, wasi }) => {
        const { instance, Bucket } = this.#state;

        return instance.send(new GetObjectCommand({
            Bucket,
            Key: wasm
        }))
            .then(data => new fetch.Response(data.Body).buffer())
            .then(async data => {
                const { Context } = require('@extism/extism');
                const ctx = new Context();
                const plugin = ctx.plugin(data, wasi);

                const buf = await plugin.call(functionName, input)
                const output = buf.toString()
                plugin.free()

                return {
                    status: 200,
                    body: {
                        data: output
                    }
                }
            })
            .catch(err => {
                console.log(err)
                return {
                    status: 400,
                    body: {
                        error: err
                    }
                }
            })
    }

    isWasmExists = (wasmId, release) => {
        const { instance, Bucket } = this.#state;

        if (!release) {
            return Promise.resolve(false);
        } else {
            return instance.send(new HeadObjectCommand({
                Bucket,
                Key: `${wasmId}.wasm`
            }))
                .then(() => true)
                .catch(() => false)
        }
    }

    getSources = pluginId => {
        const { instance, Bucket } = this.#state;

        const params = {
            Bucket,
            Key: `${pluginId}.zip`
        }

        return instance.send(new GetObjectCommand(params))
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

    getConfigurations = (email, pluginId) => {
        const { instance, Bucket } = this.#state;

        return this.getUser(email)
            .then(data => {
                const plugin = data.plugins.find(f => f.pluginId === pluginId)

                const files = [{
                    ext: 'json',
                    filename: 'config',
                    readOnly: true,
                    content: JSON.stringify({
                        ...plugin
                    }, null, 4)
                }]

                return instance.send(new GetObjectCommand({
                    Bucket,
                    Key: `${plugin.pluginId}-logs.zip`
                }))
                    .then(data => new fetch.Response(data.Body).buffer())
                    .then(data => {
                        return [
                            ...files,
                            {
                                ext: 'zip',
                                filename: 'logs',
                                readOnly: true,
                                content: data
                            }
                        ]
                    })
                    .catch(() => {
                        return files;
                    })
            })
    }

    #removeBinaries = versions => {
        return Promise.all(versions.map(version => this.#deleteObject(version)));
    }

    #deleteObject = key => {
        const { instance, Bucket } = this.#state;

        const params = {
            Bucket,
            Key: key
        }

        return instance.send(new DeleteObjectCommand(params))
            .catch(err => { log.error(err) });
    }

    deletePlugin = (email, pluginId) => {
        return new Promise(resolve => this.getUser(email)
            .then(data => {
                if (Object.keys(data).length > 0) {
                    this.updateUser(email, {
                        ...data,
                        plugins: data.plugins.filter(f => f.pluginId !== pluginId)
                    })
                        .then(() => {
                            const plugin = data.plugins.find(f => f.pluginId === pluginId);
                            const pluginHash = (plugin || {}).last_hash;

                            Promise.all([
                                this.#deleteObject(`${pluginHash}.zip`),
                                this.#deleteObject(`${pluginHash}-logs.zip`),
                                this.#removeBinaries((plugin.versions || []).map(r => r.name))
                            ])
                                .then(() => resolve({ status: 204, body: null }))
                                .catch(err => {
                                    resolve({
                                        status: 400,
                                        body: {
                                            error: err.message
                                        }
                                    })
                                })
                        })
                } else {
                    resolve({
                        status: 401,
                        body: {
                            error: 'invalid credentials'
                        }
                    })
                }
            }))
    }

    updatePlugin = (id, body) => {
        const { instance, Bucket } = this.#state;

        const params = {
            Bucket,
            Key: `${id}.zip`,
            Body: body
        }

        return instance.send(new PutObjectCommand(params))
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

    createEmptyPlugin = (email, metadata, isGithub) => {
        const { instance, Bucket } = this.#state;

        return new Promise(resolve => {
            this.createUserIfNotExists(email)
                .then(() => {
                    this.getUser(email)
                        .then(data => {
                            const pluginId = crypto.randomUUID()
                            const plugins = [
                                ...(data.plugins || []),
                                isGithub ? {
                                    filename: metadata.repo,
                                    owner: metadata.owner,
                                    ref: metadata.ref,
                                    type: 'github',
                                    pluginId: pluginId,
                                    private: metadata.private
                                } : {
                                    filename: metadata.name.replace(/ /g, '-'),
                                    type: metadata.type,
                                    pluginId: pluginId
                                }

                            ]
                            const params = {
                                Bucket,
                                Key: `${format(email)}.json`,
                                Body: JSON.stringify({
                                    ...data,
                                    plugins
                                })
                            }

                            instance.send(new PutObjectCommand(params))
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

    patchPluginName = (email, pluginId, newName) => {
        return this.getUser(email)
            .then(data => this.updateUser(email, {
                ...data,
                plugins: (data.plugins || []).map(plugin => {
                    if (plugin.pluginId === pluginId) {
                        return {
                            ...plugin,
                            filename: newName
                        }
                    } else {
                        return plugin
                    }
                })
            }))
    }
};