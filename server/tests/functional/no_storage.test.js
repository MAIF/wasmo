const { GenericContainer, Network, Wait } = require("testcontainers");

let instance;
let container;

beforeAll(async () => {
  const network = await new Network().start();

  container = await new GenericContainer("wasmo")
    .withNetwork(network)
    .withNetworkAliases("foo")
    .withExposedPorts(5001)
    .withEnvironment({
      MANAGER_PORT: 5001,
      AUTH_MODE: "NO_AUTH",
      CHECK_DOMAINS: false,
      WASMO_CLIENT_ID: "id",
      WASMO_CLIENT_SECRET: "secret"
    })
    .withWaitStrategy(Wait.forHttp("/_/healthcheck", 5001)
      .forStatusCodeMatching(statusCode => statusCode === 200))
    .start()

  instance = `http://localhost:${container.getFirstMappedPort()}`;

  await new Promise(resolve => {
    setTimeout(resolve, 10000);
  })
}, 60000);

afterAll(() => {
  container?.stop()
})

test('/health', async () => {
  return fetch(`${instance}/health`)
    .then(r => expect(r.status).toBe(200))
});

test('/api/version', async () => {
  return fetch(`${instance}/api/version`)
    .then(r => expect(r.status).toBe(200))
});

test('/api/development', () => {
  return fetch(`${instance}/api/development`)
    .then(r => expect(r.status).toBe(200))
});

test('/api/plugins/build with invalid template', () => {
  return fetch(`${instance}/api/plugins/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "metadata": {
        "name": "foobar",
        "type": "js",
        "template": "thoth"
      },
      "files": [
        {
          "name": "index.js",
          "content": "export default function execute() { Host.outputString(\"FOOBAR\") }"
        }
      ]
    })
  })
    .then(r => {
      expect(r.status).toBe(400)
      return r.json()
    })
});

test('/api/plugins/build', () => {
  return fetch(`${instance}/api/plugins/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      metadata: {
        name: 'foobar',
        type: 'js'
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
      expect(r.status).toBe(200)
      return r.json()
    })
    .then(data => {
      expect(data.queue_id).toBeDefined()
    });
});

test('/api/templates', () => {
  return Promise.all([
    ...['rust', 'js', 'go', 'ts', 'opa']
      .map(type => {
        return fetch(`${instance}/api/templates?type=${type}`)
          .then(r => expect(r.status).toBe(200))
      }),
    fetch(`${instance}/api/templates?type=unknowntype`)
      .then(r => expect(r.status).toBe(404))
  ]);
});

test('should fetch ui', () => {
  return fetch(`${instance}/`)
    .then(r => {
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type').toLowerCase()).toBe("text/html; charset=utf-8");
    });
});
