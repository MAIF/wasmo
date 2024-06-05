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
            client.query("CREATE TABLE IF NOT EXISTS plugins(id VARCHAR(200), content JSONB)"),
            client.query("CREATE TABLE IF NOT EXISTS jobs(id SERIAL, plugin_id VARCHAR UNIQUE, created_at TIMESTAMP default current_timestamp)"),
        ]);
        client.release()
    }

    getPlugins = () => {
        return this.#pool.connect()
            .then(async client => {
                const res = await client.query("SELECT content FROM plugins", [])
                client.release();

                return res.rowCount > 0 ? res.rows.map(r => r.content) : []
            })
    }

    getUserPlugins = async email => {
        return this.#pool.connect()
            .then(async client => {
                const res = await client.query("SELECT content FROM plugins WHERE content->'admins' ? $1::text OR content->'users' ? $1::text", [email])
                client.release();

                return res.rowCount > 0 ? res.rows.map(r => r.content) : []
            })
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

    putWasmFileToS3 = (wasmFolder) => {
        return this.#sourcesDatastore.putWasmFileToS3(wasmFolder);
    }

    putBuildLogsToS3 = (logId, logsFolder) => {
        return this.#sourcesDatastore.putBuildLogsToS3(logId, logsFolder);
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

                return this.updatePluginList(pluginId, patchPlugin)
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

    hasRights = (email, pluginId) => {
        return this.#pool.connect()
            .then(client => client.query("SELECT * FROM plugins WHERE id = $1::text", [pluginId])
                .then(res => {
                    client.release()
                    return res.rowCount === 1 ? res.rows[0].content : {}
                }))
            .then(plugin => {
                if (email === "*")
                    return

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
        try {
            await this.hasRights(email, pluginId)
        } catch (_err) {
            return {}
        }

        return this.#pool.connect()
            .then(client => client.query("SELECT * FROM plugins WHERE id = $1::text", [pluginId])
                .then(res => {
                    client.release()
                    return res.rowCount === 1 ? res.rows[0].content : {}
                }))
    }

    getConfigurations = async (email, pluginId) => {
        const plugin = await this.getPlugin(email, pluginId);

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
        return new Promise(resolve => this.getPlugin(email, pluginId)
            .then(plugin => {
                Promise.all([
                    this.#sourcesDatastore.deleteObject(`${pluginId}.zip`),
                    this.#sourcesDatastore.deleteObject(`${pluginId}-logs.zip`),
                    this.#sourcesDatastore.removeBinaries((plugin.versions || []).map(r => r.name)),
                    this.#sourcesDatastore.deleteObject(`${pluginId}.json`),
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

    updatePlugin = (id, body) => {
        return this.#sourcesDatastore.updatePlugin(id, body);
    }

    createEmptyPlugin = (email, metadata, isGithub) => {
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
            }

            console.log('generate pluginID', pluginId, newPlugin.pluginId)

            return this.#pool.connect()
                .then(client => {
                    return client.query("INSERT INTO plugins(id, content) VALUES($1, $2::jsonb)", [newPlugin.pluginId, JSON.stringify({
                        ...newPlugin,
                        admins: [email],
                        users: []
                    })])
                        .then(() => {
                            client.release()
                            return this.getUserPlugins(email)
                        })
                })
                .then(plugins => {
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

        return this.updatePluginList(pluginId, {
            ...plugin,
            [field]: value
        })
    }

    patchPluginName = (email, pluginId, value) => {
        return this.patchPlugin(email, pluginId, 'filename', value)
    }

    patchPluginUsers = async (email, pluginId, newUsers, newAdmins) => {
        const plugin = await this.getPlugin(email, pluginId)

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

    addPluginToList = async (email, plugin) => {
        return this.#pool.connect()
            .then(client => {
                return client.query("INSERT INTO plugins(id, content) VALUES($1, $2::jsonb)", [plugin.pluginId, JSON.stringify({
                    pluginId: plugin.pluginId,
                    admins: [email],
                    users: []
                })])
                    .then(() => client.release())
            })
    }

    updatePluginList = async (pluginId, content) => {
        return this.#pool.connect()
            .then(client => {
                return client.query("UPDATE plugins SET content = $1::jsonb WHERE id = $2", [JSON.stringify(content), pluginId])
                    .then(() => client.release())
            })
    }

    removePluginFromList = async (pluginId) => {
        return this.#pool.connect()
            .then(client => {
                return client.query("DELETE FROM plugins WHERE id = $1", [pluginId])
                    .then(() => client.release())
            })
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

    getInvitation = (email, pluginId) => this.getPlugin(email, pluginId)

    canSharePlugin = async (email, pluginId) => {
        return this.#pool.connect()
            .then(client => client.query("SELECT * FROM plugins WHERE id = $1::text AND content->'admins' ? $2::text", [pluginId, email])
                .then(res => {
                    client.release()
                    return res.rowCount > 0
                }))
    }

    getPluginUsers = (email, pluginId) => {
        return this.#pool.connect()
            .then(client => client.query(`SELECT content->'admins' as admins, content->'users' as users
                FROM plugins 
                WHERE id = $1::text AND content->'admins' ? $2::text`, [pluginId, email])
                .then(res => {
                    client.release()
                    return res.rowCount > 0 ? res.rows[0] : { admins: [], users: [] }
                }))
            .then(data => ({ status: 200, data }))
    }
}