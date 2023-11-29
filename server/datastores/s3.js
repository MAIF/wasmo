const { GetObjectCommand, PutObjectCommand, HeadObjectCommand,
    S3Client, HeadBucketCommand, CreateBucketCommand,
    DeleteObjectCommand, ListObjectsCommand } = require("@aws-sdk/client-s3");
const fetch = require('node-fetch');
const dns = require('dns');
const url = require('url');

const { format } = require('../utils');
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

        return this.#state.s3.send(new HeadBucketCommand(params))
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

    putWasmFileToS3(wasmFolder) { console.log('putWasmFileToS3') }

    putBuildLogsToS3(logId, logsFolder) { }

    putWasmInformationsToS3(userMail, pluginId, newHash, generateWasmName) { }

    getWasm(Key, res) { }
};