const { GenericContainer, Network } = require("testcontainers");

let instance;

beforeAll(async () => {
    const network = await new Network().start();

    const s3 = await new GenericContainer("scality/s3server:latest")
        .withNetwork(network)
        .withName("s3")
        .withExposedPorts(8000)
        .withEnvironment({
            SCALITY_ACCESS_KEY_ID: 'access_key',
            SCALITY_SECRET_ACCESS_KEY: 'secret'
        })
        .start();

    const pg = await new GenericContainer("postgres:13")
        .withNetwork(network)
        .withExposedPorts(5432)
        .withEnvironment({
            POSTGRES_PASSWORD: "password",
            POSTGRES_DB: "wasmo"
        })
        .start()

    const container = await new GenericContainer("wasmo")
        .withNetwork(network)
        .withExposedPorts(5004)
        .withEnvironment({
            MANAGER_PORT: 5004,
            AUTH_MODE: "NO_AUTH",
            STORAGE: "DOCKER_S3_POSTGRES",
            
            CHECK_DOMAINS: false,
            
            WASMO_CLIENT_ID: "id",
            WASMO_CLIENT_SECRET: "secret",
            
            AWS_ACCESS_KEY_ID: "access_key",
            AWS_SECRET_ACCESS_KEY: "secret",
            S3_ENDPOINT: `http://host.docker.internal:${s3.getFirstMappedPort()}`,
            S3_FORCE_PATH_STYLE: true,
            S3_BUCKET: "wasmo",
            
            PG_HOST: "host.docker.internal",
            PG_PORT: pg.getFirstMappedPort(),
            PG_DATABASE: "wasmo",
            PG_USER: "postgres",
            PG_PASSWORD: "password",
            PG_POOL_SIZE: 20,
            PG_IDLE_TIMEOUT_MILLIS: 30000,
            PG_CONNECTION_TIMEOUT_MILLIS: 2000
        })
        .start();

    instance = `http://localhost:${container.getFirstMappedPort()}`;

    await new Promise(resolve => {
        setTimeout(resolve, 10000);
    })
}, 60000);

test('/api/plugins', () => {
    return fetch(`${instance}/api/plugins`)
        .then(r => {
            expect(r.status).toBe(200)
            return r.json()
        })
        .then(data => {
            expect(data).toStrictEqual([])
        });
});

test('/api/plugins (missing body)', () => {
    return fetch(`${instance}/api/plugins`, {
        method: 'POST',
    })
        .then(r => {
            expect(r.status).toBe(400)
        });
});

function createPlugin(name, type) {
    return fetch(`${instance}/api/plugins`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            metadata: {
                name,
                type
            },
            files: [
                {
                    name: 'index.js',
                    content: 'export default function execute() { Host.outputString("FOOBAR") }'
                }
            ]
        })
    })
        .then(r => {
            expect(r.status).toBe(201)
            return r.json()
        })
        .then(data => {
            expect(data.plugin_id).toBeDefined()
            return data.plugin_id
        });
}

test('/api/plugins (POST JSON body)', async () => {
    await createPlugin("foobar", "js");
});

test('/api/plugins (POST & GET)', async () => {
    const pluginId = await createPlugin("foobar2", "js");

    return fetch(`${instance}/api/plugins/${pluginId}`)
        .then(r => {
            expect(r.status).toBe(200)
            expect(r.headers.get('content-type').toLowerCase()).toBe("application/zip");
        });
});

test('/api/plugins/:id/build', async () => {
    const pluginId = await createPlugin("foobar3", "js");

    await fetch(`${instance}/api/plugins/${pluginId}/build`, {
        method: "POST"
    })
        .then(r => {
            expect(r.status).toBe(200)
            return r.json()
        })
        .then(data => {
            expect(data.queue_id).toBeDefined()
            return data.queue_id
        });
}, 15000);

test('/api/plugins/:id/build', async () => {
    const pluginId = await createPlugin("foobar3", "js");

    await fetch(`${instance}/api/plugins/${pluginId}/build`, {
        method: "POST"
    })
        .then(r => {
            expect(r.status).toBe(200)
            return r.json()
        })
        .then(data => {
            expect(data.queue_id).toBeDefined()
            return data.queue_id
        });
}, 15000);

async function checkWasm(attempts) {
    await fetch(`${instance}/api/wasm/foobar3-1.0.0-dev`)
        .then(r => {
            if (r.status === 200) {
                expect(true).toBe(true)
            } else if (attempts - 1 > 0) {
                setTimeout(() => checkWasm(attempts - 1), 2500)
            } else {
                // intentionally failed the test because the value was not found
                expect(true).toBe(false)
            }
        })
}

test('/api/plugins/:id/build & /api/wasm/:id', async () => {
    const pluginId = await createPlugin("foobar3", "js");

    await fetch(`${instance}/api/plugins/${pluginId}/build`, {
        method: "POST"
    })
        .then(r => {
            expect(r.status).toBe(200)
            return r.json()
        })
        .then(data => {
            expect(data.queue_id).toBeDefined()
            return data.queue_id
        });

    await checkWasm(10)
}, 60000 * 5);

test('/api/plugins & /api/plugins/:id/filename', async () => {
    const pluginId = await createPlugin("foobar3", "js");

    await fetch(`${instance}/api/plugins/${pluginId}/filename`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filename: 'barfoo'
        })
    })
        .then(r => expect(r.status).toBe(204))

    await fetch(`${instance}/api/plugins`)
        .then(r => r.json())
        .then(data => {
            expect(data.some(d => d.filename === "barfoo")).toBe(true)
        });

}, 15000);