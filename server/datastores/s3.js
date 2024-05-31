const crypto = require('crypto')
const { GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
    S3Client,
    HeadBucketCommand,
    CreateBucketCommand,
    DeleteObjectCommand,
    DeleteBucketCommand
} = require("@aws-sdk/client-s3");
const { fromUtf8 } = require("@aws-sdk/util-utf8-node");

const fetch = require('node-fetch');
const dns = require('dns');
const url = require('url');
const fs = require('fs-extra');

const { format, isAString } = require('../utils');
const Datastore = require('./api');
const { ENV, STORAGE } = require("../configuration");
const logger = require("../logger");
const consumers = require('node:stream/consumers');
const AdmZip = require("adm-zip");
const { Console } = require('console');
const CustomStream = require('./CustomStream');

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
                    } catch (_err) {
                        resolve({})
                    }
                })
                .catch(_err => {
                    resolve({})
                })
        })
    }

    getPlugin = async (owner, pluginId) => {
        const user = await this.getUser(owner);

        return user.plugins.find(plugin => plugin.pluginId === pluginId);
    }

    getUserPlugins = (email) => {
        return this.getUser(email)
            .then(data => data.plugins || [])
            .then(plugins => Promise.all(plugins.map(plugin => {
                if (plugin.owner) {
                    return this.getPlugin(plugin.owner, plugin.pluginId)
                        .then(res => ({ ...res, owner: plugin.owner }))
                } else {
                    return Promise.resolve(plugin)
                }
            })))
    }

    #addUser = async (email) => {
        const { instance, Bucket } = this.#state;

        const users = await this.getUsers();

        await instance.send(new PutObjectCommand({
            Bucket,
            Key: 'users.json',
            Body: fromUtf8(JSON.stringify([
                ...users,
                email
            ])),
            ContentType: 'application/json',
        }))
    }

    createUserIfNotExists = async (email) => {
        const { instance, Bucket } = this.#state;;

        // console.log("attempt to create user : " + email)
        try {
            const res = await instance.send(new HeadObjectCommand({
                Bucket,
                Key: `${format(email)}.json`
            }))
            // console.log('user file has been retrieved : ' + email);
        } catch (err) {
            // console.log('user file not found : ' + email);
            await this.#addUser(format(email))
        }
    }

    getUsers = async () => {
        const { instance, Bucket } = this.#state;

        try {
            const rawData = await instance.send(new GetObjectCommand({
                Bucket,
                Key: 'users.json'
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

    updateUser = (email, content) => {
        const { instance, Bucket } = this.#state;

        const jsonProfile = format(email);

        return new Promise(resolve => {
            instance.send(new PutObjectCommand({
                Bucket,
                Key: `${jsonProfile}.json`,
                Body: fromUtf8(JSON.stringify(content)),
                ContentType: 'application/json'
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

    putWasmInformationsToS3 = (email, pluginId, newHash, generateWasmName) => {
        return this.getUser(email)
            .then(data => {
                const plugin = data.plugins.map(plugin => plugin.pluginId === pluginId)

                if (plugin.owner)
                    return this.putWasmInformationsToS3(plugin.owner, pluginId, newHash, generateWasmName)

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
        return this.getUser(email)
            .then(data => {
                const plugin = data.plugins.find(f => f.pluginId === pluginId)

                if (plugin.owner)
                    return this.getConfigurations(plugin.owner, pluginId)

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

    #deleteRootPlugin = async (plugin, pluginId) => {
        const { admins, users } = plugin;

        await Promise.all([
            ...(admins || []),
            ...(users || [])
        ].map(user => this.#removePluginFromUser(user, pluginId)))

        return this.deletePlugin(plugin.owner, pluginId)
    }

    deletePlugin = (email, pluginId) => {
        return new Promise(resolve => this.getUser(email)
            .then(data => {
                if (Object.keys(data).length > 0) {
                    const plugin = data.plugins.find(f => f.pluginId === pluginId)

                    this.updateUser(email, {
                        ...data,
                        plugins: data.plugins.filter(f => f.pluginId !== pluginId)
                    })
                        .then(() => {
                            if (plugin.owner || plugin.users || plugin.admins) {
                                this.#deleteRootPlugin(plugin, pluginId)
                                    .then(resolve)
                            } else {
                                const pluginHash = (plugin || {}).last_hash;
                                Promise.all([
                                    this.deleteObject(`${pluginHash}.zip`),
                                    this.deleteObject(`${pluginHash}-logs.zip`),
                                    this.deleteObject(`${pluginId}.zip`),
                                    this.deleteObject(`${pluginId}-logs.zip`),
                                    this.removeBinaries((plugin.versions || []).map(r => r.name))
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
                            }
                        })
                } else {
                    resolve({
                        status: 204, body: null
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
                                    pluginId: pluginId,
                                    template: metadata.template
                                }

                            ]
                            const params = {
                                Bucket,
                                Key: `${format(email)}.json`,
                                Body: fromUtf8(JSON.stringify({
                                    ...data,
                                    plugins
                                })),
                                ContentType: 'application/json',
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

    patchPlugin = (email, pluginId, field, value) => {
        return this.getUser(email)
            .then(data => {
                const plugin = (data.plugins || []).find(plugin => plugin.pluginId === pluginId)

                if (plugin.owner)
                    return this.patchPlugin(plugin.owner, pluginId, field, value)
                else
                    return this.updateUser(email, {
                        ...data,
                        plugins: (data.plugins || []).map(plugin => {
                            if (plugin.pluginId === pluginId) {
                                return {
                                    ...plugin,
                                    [field]: value
                                }
                            } else {
                                return plugin
                            }
                        })
                    })
            })
    }

    patchPluginName = (email, pluginId, newName) => {
        return this.patchPlugin(email, pluginId, 'filename', newName)
    }

    #removePluginFromUser = async (email, pluginId) => {
        const user = await this.getUser(email)

        return this.updateUser(email, {
            ...user,
            plugins: (user.plugins || []).filter(plugin => plugin.pluginId !== pluginId)
        })
    }

    patchPluginUsers = async (email, pluginId, newUsers, newAdmins) => {
        let currentUser = email;

        const user = await this.getUser(currentUser);

        let plugin = user.plugins.find(plugin => plugin.pluginId === pluginId)

        // if plugin is not owned by the user, we need to edit the root plugin
        if (plugin.owner) {
            currentUser = plugin.owner;

            const owner = await this.getUser(plugin.owner)
            plugin = owner.plugins.find(plugin => plugin.pluginId === pluginId)
        }

        const removedUsers = (plugin.users || []).filter(user => !newUsers.includes(user) && !newAdmins.includes(user))
        const removedAdmins = (plugin.admins || []).filter(admin => !newAdmins.includes(admin) && !newUsers.includes(admin))

        await Promise.all(removedUsers.map(user => this.#removePluginFromUser(user, pluginId)))
        await Promise.all(removedAdmins.map(admin => this.#removePluginFromUser(admin, pluginId)))

        return this.getUser(currentUser)
            .then(data => this.updateUser(currentUser, {
                ...data,
                plugins: (data.plugins || []).map(plugin => {
                    if (plugin.pluginId === pluginId) {
                        return {
                            ...plugin,
                            users: newUsers,
                            admins: newAdmins
                        }
                    } else {
                        return plugin
                    }
                })
            }))
    }

    acceptInvitation = async (userEmail, ownerId, pluginId) => {
        try {
            const ownerPlugins = await this.getUserPlugins(ownerId)
            const user = await this.getUser(userEmail)

            const ownerPlugin = ownerPlugins.find(plugin => plugin.pluginId === pluginId)

            if (ownerPlugin &&
                ((ownerPlugin.users || []).includes(userEmail) ||
                    (ownerPlugin.admins || []).includes(userEmail))) {

                const newPlugin = {
                    pluginId: ownerPlugin.pluginId,
                    owner: ownerId
                }

                return this.updateUser(userEmail, {
                    ...user,
                    plugins: [
                        ...(user.plugins || []).filter(plugin => plugin.pluginId !== pluginId),
                        newPlugin
                    ]
                })
                    .then(() => true)
            } else {
                return false
            }
        } catch (err) {
            console.log(err)
            return false
        }
    }

    canSharePlugin = async (email, pluginId) => {
        const user = await this.getUser(email);

        const plugin = user.plugins.find(plugin => plugin.pluginId === pluginId);

        if (plugin?.owner) {
            const owner = await this.getUser(plugin.owner)

            const rootPlugin = owner.plugins.find(plugin => plugin.pluginId === pluginId);

            if (rootPlugin) {
                return (rootPlugin.admins || []).includes(email)
            }

            return false
        }

        return true
    }

    getPluginUsers = async (email, pluginId) => {
        const user = await this.getUser(email);

        const plugin = user.plugins.find(plugin => plugin.pluginId === pluginId);

        if (plugin.owner) {
            const owner = await this.getUser(plugin.owner)

            const rootPlugin = owner.plugins.find(plugin => plugin.pluginId === pluginId);

            return {
                admins: rootPlugin.admins,
                users: rootPlugin.users
            }
        }

        return {
            admins: plugin.admins,
            users: plugin.users
        }
    }
};
