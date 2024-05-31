const crypto = require('crypto')
const cron = require('node-cron');

const { ENV } = require("../configuration");

const Datastore = require('./api');
const S3Datastore = require('./s3');
const { Pool } = require('pg');

const logger = require("../logger");
const { isAString } = require('../utils');

/**
 * Class representing PG.
 * @extends Datastore
 */
module.exports = class PgDatastore extends Datastore {
    /** @type {S3Datastore} */
    #sourcesDatastore = undefined;

    /** @type {Pool} */
    #pool = undefined;

    /**
     * @param {S3Datastore} sourcesDatastore 
     */
    constructor(sourcesDatastore) {
        super();
        this.#sourcesDatastore = sourcesDatastore;
    }


    initialize = async () => {
        logger.info("Initialize pg client");

        await this.#sourcesDatastore.initialize();

        this.#pool = new Pool({
            host: ENV.PG.HOST,
            port: ENV.PG.PORT,
            database: ENV.PG.DATABASE,
            user: ENV.PG.USER,
            password: ENV.PG.PASSWORD,
            max: ENV.PG.POOL_SIZE,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })
            .on('error', err => logger.error(err));


        const client = await this.#pool.connect();

        await Promise.all([
            client.query("CREATE TABLE IF NOT EXISTS users(id SERIAL, email VARCHAR, content JSONB)"),
            client.query("CREATE TABLE IF NOT EXISTS jobs(id SERIAL, plugin_id VARCHAR UNIQUE, created_at TIMESTAMP default current_timestamp)"),
        ]);
        client.release()
    }

    getUser = (email) => {
        return this.#pool.connect()
            .then(async client => {
                const res = await client.query("SELECT content from users WHERE email = $1", [email])
                client.release();

                return res.rowCount > 0 ? res.rows[0].content : null;
            })
    }

    getUserPlugins = (email) => {
        return this.getUser(email)
            .then(user => user ? user.plugins : [])
            .then(plugins => Promise.all(plugins.map(plugin => {
                if (plugin.owner) {
                    return this.getPlugin(plugin.owner, plugin.pluginId)
                } else {
                    return Promise.resolve(plugin)
                }
            })))
            .catch(err => logger.error(err))
    }

    createUserIfNotExists = async (email) => {
        const optUser = await this.getUser(email);

        if (!optUser) {
            await this.#pool.connect()
                .then(client => {
                    return client.query("INSERT INTO users(email, content) VALUES($1, $2::jsonb)", [email, {}])
                        .then(() => client.release())
                })
        }
    }

    getUsers = () => {
        return this.#pool.connect()
            .then(async client => {
                const res = await client.query("SELECT * from users");
                client.release();
                return res.rows;
            })
    }

    updateUser = (email, content) => {
        return this.#pool.connect()
            .then(client => {
                return client.query("UPDATE users SET content = $1::jsonb WHERE email = $2", [content, email])
                    .then(() => client.release());
            })
            .then(() => ({ status: 200 }))
            .catch(_err => {
                resolve({
                    error: 400,
                    status: 'something bad happened'
                })
            });
    }

    putWasmFileToS3 = (wasmFolder) => {
        return this.#sourcesDatastore.putWasmFileToS3(wasmFolder);
    }

    putBuildLogsToS3 = (logId, logsFolder) => {
        return this.#sourcesDatastore.putBuildLogsToS3(logId, logsFolder);
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

    getWasm = (wasmId) => {
        return this.#sourcesDatastore.getWasm(wasmId);
    }

    run = (wasm, props) => {
        return this.#sourcesDatastore.run(wasm, props);
    }

    isWasmExists = (wasmId, release) => {
        return this.#sourcesDatastore.isWasmExists(wasmId, release);
    }

    getSources = pluginId => {
        return this.#sourcesDatastore.getSources(pluginId);
    }

    #getPlugin = (email, pluginId) => {
        return this.#pool.connect()
            .then(client => {
                return client.query("SELECT content FROM users WHERE email = $1", [email])
                    .then(res => {
                        client.release();

                        return res.rowCount > 0 ? (res.rows[0].content.plugins || [])?.find(plugin => plugin.pluginId === pluginId) : {}
                    })
            })
    }

    getConfigurations = async (email, pluginId) => {
        const plugin = await this.#getPlugin(email, pluginId);

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

        return this.#sourcesDatastore.getConfigurationsFile(plugin.pluginId, files);
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
                                this.#sourcesDatastore.deleteObject(`${pluginHash}.zip`),
                                this.#sourcesDatastore.deleteObject(`${pluginHash}-logs.zip`),
                                this.deleteObject(`${pluginId}.zip`),
                                this.deleteObject(`${pluginId}-logs.zip`),
                                this.#sourcesDatastore.removeBinaries((plugin.versions || []).map(r => r.name))
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
        return this.#sourcesDatastore.updatePlugin(id, body);
    }

    createEmptyPlugin = (email, metadata, isGithub) => {
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

                            return this.#pool.connect()
                                .then(client => {
                                    return client.query("UPDATE users SET content = $1::jsonb WHERE email = $2", [{ plugins }, email])
                                        .then(() => client.release())
                                })
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
                                        status: 400,
                                        body: {
                                            error: err.message
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
            .then(data => this.updateUser(email, {
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
            }))
    }

    patchPluginName = (email, pluginId, newName) => {
        return this.patchPlugin(email, pluginId, 'filename', value)
    }

    #removePluginFromUser = async (email, pluginId) => {
        const user = await this.getUser(email)

        return this.updateUser(email, {
            ...user,
            plugins: (user.plugins || []).filter(plugin => plugin.pluginId !== pluginId)
        })
    }

    patchPluginUsers = async (email, pluginId, newUsers, newAdmins) => {
        const user = await this.getUser(email);

        const plugin = user.plugins.find(plugin => plugin.pluginId === pluginId)

        const removedUsers = (plugin.users || []).filter(user => !newUsers.includes(user))
        const removedAdmins = (plugin.admins || []).filter(admin => !newAdmins.includes(admin))

        await Promise.all(removedUsers.map(user => this.#removePluginFromUser(user, pluginId)))
        await Promise.all(removedAdmins.map(admin => this.#removePluginFromUser(admin, pluginId)))

        return this.getUser(email)
            .then(data => this.updateUser(email, {
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

    isJobRunning = pluginId => {
        return this.#pool.connect()
            .then(client => {
                return client.query("INSERT INTO jobs(plugin_id) VALUES($1) on conflict (plugin_id) do nothing", [pluginId])
                    .then(res => {
                        client.release();

                        return res.rowCount === 0;
                    })
            })
    }

    cleanJobs = () => {
        cron.schedule('0 */1 * * * *', this.cleanJobsRunner);
        this.cleanJobsRunner()
    }

    cleanJobsRunner = () => {
        return this.#pool.connect()
            .then(client => {
                return client.query(`DELETE from jobs WHERE created_at < NOW() - make_interval(mins => 1)`)
                    .then(() => {
                        client.release()
                    })
            })
    }

    removeJob = async pluginId => {
        const client = await this.#pool.connect();

        await client.query("DELETE FROM jobs WHERE plugin_id = $1", [pluginId]);

        client.release();
    }

    waitingTimeBeforeNextRun = pluginId => {
        return this.#pool.connect()
            .then(client => {
                return client.query("SELECT created_at FROM jobs WHERE plugin_id = $1", [pluginId])
                    .then(res => {
                        client.release();

                        if (res.rowCount === 0)
                            return null

                        const interval = 5 * 60 * 1000 - new Date() - new Date(res.rows[0]?.created_at);

                        return interval > 0 ? interval : 0;
                    });
            });
    }

    acceptInvitation = async (userEmail, ownerId, pluginId) => {
        return this.#sourcesDatastore.acceptInvitation(userEmail, ownerId, pluginId)
    }

    canSharePlugin = (email, pluginId) => {
        return this.#sourcesDatastore.canSharePlugin(email, pluginId)
    }

    getPluginUsers = async (email, pluginId) => {
        return this.#sourcesDatastore.getPluginUsers(email, pluginId)
    }
};