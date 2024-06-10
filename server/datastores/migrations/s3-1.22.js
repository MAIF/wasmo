const consumers = require('node:stream/consumers');
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const fetch = require('node-fetch');
const { fromUtf8 } = require("@aws-sdk/util-utf8-node");

async function hasPluginsFile(s3Datastore) {
    const { instance, Bucket } = s3Datastore.state;

    try {
        const rawData = await instance.send(new GetObjectCommand({
            Bucket,
            Key: 'plugins.json'
        }))
        await new fetch.Response(rawData.Body).json();

        return true
    } catch (err) {
        return false
    }
}

async function getUsers(s3Datastore) {
    const { instance, Bucket } = s3Datastore.state;
    try {
        const rawData = await instance.send(new GetObjectCommand({
            Bucket,
            Key: 'users.json'
        }))
        return new fetch.Response(rawData.Body).json();
    } catch (err) {
        return []
    }
}

function getUser(s3Datastore, email) {
    const { instance, Bucket } = s3Datastore.state;

    return new Promise(resolve => {
        instance.send(new GetObjectCommand({
            Bucket,
            Key: `${email}.json`
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

function getUserPlugins(s3Datastore, email) {
    return getUser(s3Datastore, email)
        .then(data => data.plugins || [])
}

async function createPlugin(s3Datastore, email, pluginId, content) {
    const { instance, Bucket } = s3Datastore.state;

    const params = {
        Bucket,
        Key: `${pluginId}.json`,
        Body: fromUtf8(JSON.stringify(content)),
        ContentType: 'application/json',
    }

    return instance.send(new PutObjectCommand(params))
}

async function S3_1_22(s3Datastore) {
    const migrated = await hasPluginsFile(s3Datastore)

    console.log('apply S3_1_22', migrated)

    if (!migrated) {
        const users = await getUsers(s3Datastore)

        const usersPlugins = await Promise.all(users.map(user => getUserPlugins(s3Datastore, user)));

        await Promise.all(usersPlugins.map((userPlugins, idx) => {
            return Promise.all(userPlugins.map(plugin => createPlugin(s3Datastore, users[idx], plugin.pluginId, {
                ...plugin,
                admins: [users[idx]],
                users: []
            })))
        }))

        const pluginsByUser = usersPlugins.reduce((acc, userPlugins, idx) => {
            return [...acc, ...userPlugins.map(plugin => ({
                plugin: {
                    ...plugin,
                    admins: [users[idx]],
                    users: []
                }, email: users[idx]
            }))]
        }, [])

        pluginsByUser
            .reduce((promise, item) => promise.then(() => new Promise(resolve => {
                const { plugin, email } = item;

                s3Datastore.addPluginToList(email, plugin)
                    .then(resolve)
            })), Promise.resolve())
    }
}

module.exports = {
    S3_1_22
}