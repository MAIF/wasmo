const crypto = require('crypto')
const { GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
    S3Client,
    HeadBucketCommand,
    CreateBucketCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const { fromUtf8 } = require("@aws-sdk/util-utf8-node");

const fetch = require('node-fetch');
const dns = require('dns');
const url = require('url');
const fs = require('fs-extra');

const { isAString } = require('../utils');
const Datastore = require('./api');
const { ENV, STORAGE } = require("../configuration");
const logger = require("../logger");
const AdmZip = require("adm-zip");
const { Console } = require('console');
const CustomStream = require('./CustomStream');

module.exports = class S3Datastore extends Datastore {
    #state = {
        instance: undefined,
        Bucket: undefined
    }

    #createBucketIfMissing = () => {
        const params = { Bucket: this.#state.Bucket }

        return this.#state.instance.send(new HeadBucketCommand(params))
            .then(() => {
                logger.info("Using existing bucket")
            })
            .catch(res => {
                if (res || res.$metadata.httpStatusCode === 404 ||
                    res.$metadata.httpStatusCode === 403 ||
                    res.$metadata.httpStatusCode === 400) {
                    logger.info(`Bucket ${this.#state.Bucket} is missing.`)
                    return new Promise(resolve => {
                        this.#state.instance.send(new CreateBucketCommand(params), err => {
                            if (err) {
                                logger.error("Failed to create missing bucket")
                                logger.error(err)
                                process.exit(1)
                            } else {
                                logger.info(`Bucket ${this.#state.Bucket} created.`)
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
            logger.error("[S3 INITIALIZATION](failed): S3 Bucket is missing");
            process.exit(1);
        }

        logger.info("Initialize s3 client");

        if (ENV.STORAGE === STORAGE.DOCKER_S3 || ENV.STORAGE === STORAGE.DOCKER_S3_POSTGRES) {
            const URL = url.parse(ENV.S3_ENDPOINT);

            const ip = await new Promise(resolve => dns.lookup(URL.hostname, (_, ip) => resolve(ip)));
            logger.debug(`${URL.protocol}//${ip}:${URL.port}${URL.pathname}`)
            this.#state = {
                instance: new S3Client({
                    region: ENV.AWS_DEFAULT_REGION,
                    endpoint: `${URL.protocol}//${ip}:${URL.port}${URL.pathname}`,
                    forcePathStyle: ENV.S3_FORCE_PATH_STYLE
                }),
                Bucket: ENV.S3_BUCKET
            }
        } else {
            this.#state = {
                instance: new S3Client({
                    region: ENV.AWS_DEFAULT_REGION,
                    endpoint: ENV.S3_ENDPOINT,
                    forcePathStyle: ENV.S3_FORCE_PATH_STYLE,
                }),
                Bucket: ENV.S3_BUCKET
            }

            logger.info("Bucket initialized");
        }

        return this.#createBucketIfMissing();
    }

    getPlugins = async () => {
        const { instance, Bucket } = this.#state;

        try {
            const rawData = await instance.send(new GetObjectCommand({
                Bucket,
                Key: 'plugins.json'
            }))
            return new fetch.Response(rawData.Body).json()
        } catch (err) {
            if (err.$metadata.httpStatusCode === 404 && err.Code === "NoSuchKey") {
                return []
            } else {
                throw err
            }
        }
    }

    hasRights = (email, pluginId) => {
        return this.getPlugins()
            .then(plugins => {

                if (email === "*")
                    return

                const plugin = plugins.find(plugin => plugin.pluginId === pluginId)

                const users = plugin?.users || [];
                const admins = plugin?.admins || [];

                if (users.includes(email) || admins.includes(email)) {
                    return plugin
                }

                // TODO - better error handling
                throw 'Not authorized'
            })
    }

    getPlugin = async (email, pluginId) => {
        const { instance, Bucket } = this.#state;

        await this.hasRights(email, pluginId)

        try {
            const rawData = await instance.send(new GetObjectCommand({
                Bucket,
                Key: `${pluginId}.json`
            }))
            const res = await new fetch.Response(rawData.Body)
                .json()

            return res
        } catch (err) {
            return {}
        }
    }

    putWasmFileToS3 = (wasmFolder) => {
        const { instance, Bucket } = this.#state;

        const Key = wasmFolder.split('/').slice(-1)[0]

        return new Promise((resolve, reject) => {
            fs.readFile(wasmFolder, async (err, data) => {
                let content = data
                if (err) {
                    const [err, data] = await new Promise(resolve => fs.readFile(
                        `${wasmFolder.split("/").slice(0, -1).join('/')}/${wasmFolder.split("/").slice(-1)[0].split('-').slice(0, -1).join('-')}.wasm`
                        , (err, data) => resolve([err, data])))

                    if (err)
                        return reject(err)
                    else
                        content = data
                }

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

        try {
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
        } catch (err) {
            return Promise.resolve()
        }
    }

    pushNewPluginVersion = (email, pluginId, newHash, generateWasmName) => {
        return this.getPlugin(email, pluginId)
            .then(plugin => {
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

                const patchPlugin = {
                    ...plugin,
                    last_hash: newHash,
                    wasm: generateWasmName,
                    versions
                }

                return this.updatePluginInformations(pluginId, patchPlugin)
            })
    }

    #getWasm = async name => {
        const { instance, Bucket } = this.#state;

        try {
            const data = await instance.send(new GetObjectCommand({
                Bucket,
                Key: name
            }))
            const content = await new fetch.Response(data.Body).buffer();
            return { content };
        } catch (err) {
            return {
                error: err.Code,
                status: err?.$metadata?.httpStatusCode || 404
            }
        }
    }

    getWasm = (wasmId) => {
        return this.#getWasm(wasmId)
            .then(out => {
                if (out.error) {
                    return this.#getWasm(wasmId.replace('.wasm', ''));
                } else
                    return out;
            })
    }

    run = (wasm, { input, functionName, wasi }) => {
        const { instance, Bucket } = this.#state;

        // function proxy_log(cp, kOffs) {
        //     const buffer = cp.read(kOffs).text()

        //     console.log({ kOffs, buffer })

        //     return BigInt(0)
        // }

        return instance.send(new GetObjectCommand({
            Bucket,
            Key: wasm.endsWith('.wasm') ? wasm : `${wasm}.wasm`
        }))
            .then(data => new fetch.Response(data.Body).buffer())
            .then(async data => {
                try {
                    const { newPlugin } = require('@extism/extism');

                    const stdout = new CustomStream()
                    const stderr = new CustomStream()

                    const plugin = await newPlugin(new Uint8Array(data).buffer, {
                        useWasi: wasi,
                        // functions: {
                        //     "extism:host/user": {
                        //         proxy_log
                        //     }
                        // },
                        logger: new Console(stdout, stderr)
                    });

                    let output = ""

                    try {
                        const buf = await plugin.call(functionName, input)
                        output = buf.text()
                    } catch (err) {
                        stderr._write(err.toString(), undefined, () => { })
                    }

                    await plugin.close()

                    const stdoutOutput = stdout.contents();
                    const stderrOutput = stderr.contents();

                    stdout.destroy()
                    stderr.destroy()

                    return {
                        status: 200,
                        body: {
                            data: output,
                            stdout: stdoutOutput,
                            stderr: stderrOutput
                        }
                    };
                } catch (err) {
                    return {
                        status: 400,
                        body: {
                            error: err.toString()
                        }
                    }
                }
            })
            .catch(err => {
                console.log(err)
                return {
                    status: 400,
                    body: {
                        error: err.toString()
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

    getConfigurationsFile = (pluginId, files) => {
        const { instance, Bucket } = this.#state;

        return instance.send(new GetObjectCommand({
            Bucket,
            Key: `${pluginId}-logs.zip`
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
    }

    getConfigurations = (email, pluginId) => {
        return this.getPlugin(email, pluginId)
            .then(plugin => {
                const files = [{
                    ext: 'json',
                    filename: 'config',
                    readOnly: true,
                    content: JSON.stringify({
                        ...plugin
                    }, null, 4)
                }]

                return this.getConfigurationsFile(plugin.pluginId, files);
            })
    }

    removeBinaries = versions => {
        return Promise.all(versions.map(version => this.deleteObject(version)));
    }

    deleteObject = key => {
        const { instance, Bucket } = this.#state;

        const params = {
            Bucket,
            Key: key
        }

        return instance.send(new DeleteObjectCommand(params))
            .catch(err => { logger.error(err) });
    }

    deletePlugin = (email, pluginId) => {
        return new Promise(resolve => this.getPlugin(email, pluginId)
            .then(plugin => {
                Promise.all([
                    this.deleteObject(`${pluginId}.zip`),
                    this.deleteObject(`${pluginId}-logs.zip`),
                    this.removeBinaries((plugin.versions || []).map(r => r.name)),
                    this.deleteObject(`${pluginId}.json`),
                    this.removePluginFromList(pluginId)
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
            }))
            .catch(_ => {
                resolve({
                    status: 400,
                    body: {
                        error: "something bad happened"
                    }
                })
            })
    }

    updatePluginInformations = (id, body) => {
        const { instance, Bucket } = this.#state;

        const params = {
            Bucket,
            Key: `${id}.json`,
            ContentType: 'application/json',
            Body: fromUtf8(JSON.stringify(body))
        }

        console.log("updatePluginInformations", id, body)

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
            const pluginId = crypto.randomUUID()

            const newPlugin = isGithub ? {
                filename: metadata.repo,
                owner: metadata.owner,
                ref: metadata.ref,
                type: 'github',
                pluginId: pluginId,
                private: metadata.private
            } : {
                filename: metadata.name.replace(/ /g, '-'),
                type: metadata.type,
                pluginId: pluginId,
                template: metadata.template
            };

            console.log('generate pluginID', pluginId, newPlugin.pluginId)

            const params = {
                Bucket,
                Key: `${pluginId}.json`,
                Body: fromUtf8(JSON.stringify(newPlugin)),
                ContentType: 'application/json',
            }

            instance.send(new PutObjectCommand(params))
                .then(async () => {
                    await this.addPluginToList(email, newPlugin);
                    const plugins = await this.getUserPlugins(email);
                    resolve({
                        status: 201,
                        body: {
                            plugins
                        }
                    })
                })
                .catch(err => {
                    console.log(err)
                    resolve({
                        status: err.$metadata.httpStatusCode,
                        body: {
                            error: err.Code,
                            status: err.$metadata.httpStatusCode
                        }
                    })
                })
        })
    }

    patchPlugin = async (email, pluginId, field, value) => {
        const plugin = await this.getPlugin(email, pluginId)

        return this.updatePluginInformations(pluginId, {
            ...plugin,
            [field]: value
        })
    }

    patchPluginName = (email, pluginId, newName) => {
        return this.patchPlugin(email, pluginId, 'filename', newName)
    }

    patchPluginUsers = async (email, pluginId, newUsers, newAdmins) => {
        const plugins = await this.getPlugins()

        const plugin = plugins.find(p => p.pluginId === pluginId)

        if (plugin) {
            this.updatePluginList(pluginId, {
                ...plugin,
                users: newUsers,
                admins: newAdmins
            })
            return {
                status: 204,
                data: null
            }
        } else {
            return {
                status: 404,
                data: {
                    error: 'something bad happened'
                }
            }
        }
    }

    getUserPlugins = async email => {
        const plugins = await this.getPlugins();
        console.log(plugins)

        const userPlugins = plugins.filter(plugin => {
            const users = plugin.users || [];
            const admins = plugin.admins || [];

            return users.includes(email) || admins.includes(email)
        }) || []

        console.log("users plugins")
        console.log(userPlugins, email)

        return Promise.all(userPlugins.map(plugin => this.getPlugin(email, plugin.pluginId)))
            .then(plugins => {
                return plugins.filter(data => Object.keys(data).length > 0)
            })
    }

    addPluginToList = async (email, plugin) => {
        const { instance, Bucket } = this.#state;

        const plugins = await this.getPlugins()

        return instance.send(new PutObjectCommand({
            Bucket,
            Key: 'plugins.json',
            ContentType: 'application/json',
            Body: fromUtf8(JSON.stringify([
                ...plugins,
                {
                    pluginId: plugin.pluginId,
                    admins: [email],
                    users: []
                }
            ]))
        }))
    }

    updatePluginList = async (pluginId, content) => {
        const { instance, Bucket } = this.#state;

        const plugins = await this.getPlugins()

        return instance.send(new PutObjectCommand({
            Bucket,
            Key: 'plugins.json',
            ContentType: 'application/json',
            Body: fromUtf8(JSON.stringify(plugins.map(plugin => {
                if (plugin.pluginId === pluginId) {
                    return content
                }
                return plugin
            })))
        }))
    }

    removePluginFromList = async pluginId => {
        const { instance, Bucket } = this.#state;

        const plugins = await this.getPlugins()

        return instance.send(new PutObjectCommand({
            Bucket,
            Key: 'plugins.json',
            ContentType: 'application/json',
            Body: fromUtf8(JSON.stringify(plugins.filter(plugin => plugin.pluginId !== pluginId)))
        }))
    }

    getInvitation = (email, pluginId) => this.getPlugin(email, pluginId)

    canSharePlugin = async (email, pluginId) => {
        const plugins = await this.getPlugins()

        const plugin = plugins.find(p => p.pluginId === pluginId)

        if (plugin) {
            return plugin.admins.includes(email)
        }

        return false
    }

    getPluginUsers = async (email, pluginId) => {
        const plugins = await this.getPlugins()

        const plugin = plugins.find(p => p.pluginId === pluginId)

        if (plugin) {
            return {
                status: 200,
                data: {
                    admins: plugin.admins,
                    users: plugin.users
                }
            }
        } else {
            return {
                status: 404,
                data: {
                    error: 'something bad happened'
                }
            }
        }
    }
};
