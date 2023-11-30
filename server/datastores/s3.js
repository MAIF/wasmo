const { GetObjectCommand, PutObjectCommand, HeadObjectCommand,
    S3Client, HeadBucketCommand, CreateBucketCommand,
    DeleteObjectCommand, ListObjectsCommand } = require("@aws-sdk/client-s3");
const fetch = require('node-fetch');
const dns = require('dns');
const url = require('url');
const fs = require('fs-extra');

const { format, isAString } = require('../utils');
const Datastore = require('./api');
const { ENV, STORAGE } = require("../configuration");
const manager = require("../logger");

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

    #createBucketIfMissing() {
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

    async initialize() {
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
                state = {
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
            state = {
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

        return initializeClient()
            .then(this.#createBucketIfMissing)
    }

    getUser(email) {
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
                        resolve({})
                    }
                })
                .catch(_ => resolve({}))
        })
    }

    getUserPlugins(email) {
        return this.getUser(email)
            .then(data => data.plugins || [])
    }

    #addUser(email) {
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

    createUserIfNotExists(email) {
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

    getUsers() {
        const { instance, Bucket } = this.#state;

        return instance.send(new GetObjectCommand({
            Bucket,
            Key: 'users.json'
        }))
            .then(data => new fetch.Response(data.Body).json())
            .catch(err => console.log(err))
    }

    updateUser(email, content) {
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

    putWasmFileToS3(wasmFolder) {
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

    putBuildLogsToS3(logId, logsFolder) {
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

    putWasmInformationsToS3(email, pluginId, newHash, generateWasmName) {
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

    getWasm(wasmId) {
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

    run(wasm, { input, functionName, wasi }) {
        const { instance, Bucket } = this.#state();

        instance.send(new GetObjectCommand({
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

    isWasmExists(wasmId, release) {
        const { instance, Bucket } = this.#state();

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
};