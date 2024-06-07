const consumers = require('node:stream/consumers');
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const fetch = require('node-fetch');
const { fromUtf8 } = require("@aws-sdk/util-utf8-node");

async function hasPluginsFile(pgDatastore) {
    const client = await pgDatastore.pool.connect();

    const res = await client.query("SELECT * FROM plugins");
    client.release()

    return res.rowCount > 0
}

async function getUsers(pgDatastore) {
    const client = await pgDatastore.pool.connect();

    const res = await client.query("SELECT * FROM users");
    client.release()

    return res.rows
}

async function createPlugin(pgDatastore, plugin) {
    pgDatastore.pool.connect()
        .then(client => {
            return client.query("INSERT INTO plugins(id, content) VALUES($1, $2::jsonb)", [plugin.pluginId, JSON.stringify({ plugin })])
                .then(() => client.release())
        })
}

async function PG_1_22(pgDatastore) {
    const migrated = await hasPluginsFile(pgDatastore)

    console.log('apply PG_1_22', migrated)

    if (!migrated) {
        const usersPlugins = await getUsers(pgDatastore)

        console.log('migrate users : ', users)

        return usersPlugins.map(user => {
            return Promise.all(user.plugins.map(plugin => createPlugin(pgDatastore, plugin)))
        })
    }
}

module.exports = {
    PG_1_22
}