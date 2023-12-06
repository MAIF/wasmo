const crypto = require('crypto')

const { format } = require('../utils');
const { ENV } = require("../configuration");

const Datastore = require('./api');
const S3Datastore = require('./s3');
const { Pool } = require('pg');

const manager = require("../logger");
const log = manager.createLogger('PG');

const configuration = {
    host: ENV.PG.HOST,
    port: ENV.PG.PORT,
    database: ENV.PG.DATABASE,
    user: ENV.PG.USER,
    password: ENV.PG.PASSWORD,
    max: ENV.PG.POOL_SIZE,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
}

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
        log.info("Initialize pg client");

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
            .on('error', err => log.error(err));


        return this.#pool.connect()
            .then(client => {
                client.query("CREATE TABLE IF NOT EXISTS users(id SERIAL, email VARCHAR, content JSONB)",)
                    .then(() => client.release())
            })
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
            .catch(err => log.error(err))
    }

    createUserIfNotExists = async (email) => {
        const optUser = await this.getUser(email);

        if (!optUser) {
            await this.#pool.connect()
                .then(client => {
                    return client.query("INSERT INTO users(email) VALUES($1)", [email])
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
        return this.#sourcesDatastore.putWasmInformationsToS3(email, pluginId, newHash, generateWasmName);
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

    getConfigurations = (email, pluginId) => {
        const plugin = this.#getPlugin(email, pluginId);

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
                                    pluginId: pluginId
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