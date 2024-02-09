const { GenericContainer, Network, Wait } = require("testcontainers");

const wasmo_route = require('./otoroshi_entities/route-wasm-manager-1701851138888.json');
const authentication_module = require('./otoroshi_entities/authentication-module-new-auth-module-1701851199519.json');

let instance;

let container;
let otoroshi;

const WASMO_CLIENT_ID = "id";
const WASMO_CLIENT_SECRET = "secret";

beforeAll(async () => {
  const network = await new Network().start();

  otoroshi = await new GenericContainer("maif/otoroshi:16.14.0")
    .withNetwork(network)
    .withExposedPorts(8080)
    .withEnvironment({
      OTOROSHI_INITIAL_ADMIN_PASSWORD: 'password',
      OTOROSHI_INITIAL_ADMIN_LOGIN: 'admin@otoroshi.io'
    })
    .withWaitStrategy(Wait.forHttp("/live", 8080)
      .forStatusCodeMatching(statusCode => statusCode === 404))
    .start()

  container = await new GenericContainer("wasmo")
    .withNetwork(network)
    .withExposedPorts(5003)
    .withEnvironment({
      MANAGER_PORT: 5003,
      AUTH_MODE: "OTOROSHI_AUTH",
      CHECK_DOMAINS: false,
      WASMO_CLIENT_ID,
      WASMO_CLIENT_SECRET
    })
    .withWaitStrategy(Wait.forHttp("/_/healthcheck", 5003)
      .forStatusCodeMatching(statusCode => statusCode === 200))
    .start()

  instance = `http://localhost:${container.getFirstMappedPort()}`;

  await new Promise(resolve => {
    setTimeout(resolve, 10000);
  })
}, 30000);


afterAll(() => {
  otoroshi?.stop()
  container?.stop()
})

test('setup otoroshi', async () => {
  const _createdRoute = await fetch(`http://otoroshi-api.oto.tools:${otoroshi.getFirstMappedPort()}/api/routes`, {
    method: 'POST',
    headers: {
      "Content-type": "application/json",
      "Authorization": `Basic ${btoa('admin-api-apikey-id:admin-api-apikey-secret')}`
    },
    body: JSON.stringify(wasmo_route)
  })
    .then(r => expect(r.status).toBe(201));

  const _createdAuthenticationModule = await fetch(`http://otoroshi-api.oto.tools:${otoroshi.getFirstMappedPort()}/api/auths`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa('admin-api-apikey-id:admin-api-apikey-secret')}`
    },
    body: JSON.stringify(authentication_module)
  })
    .then(r => expect(r.status).toBe(201));
});

function getGlobalConfiguration() {
  return fetch(`http://otoroshi-api.oto.tools:${otoroshi.getFirstMappedPort()}/api/globalconfig`, {
    headers: {
      "Accept": "application/json",
      "Authorization": `Basic ${btoa('admin-api-apikey-id:admin-api-apikey-secret')}`
    }
  })
    .then(r => {
      expect(r.status).toBe(200)
      return r.json();
    });
}

test('set wasmo configuration in global configuration', async () => {
  const initialConfiguration = await getGlobalConfiguration();

  await fetch(`http://otoroshi-api.oto.tools:${otoroshi.getFirstMappedPort()}/api/globalconfig`, {
    method: 'PUT',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa('admin-api-apikey-id:admin-api-apikey-secret')}`
    },
    body: JSON.stringify({
      ...initialConfiguration,
      wasmoSettings: {
        ...initialConfiguration.wasmoSettings,
        url: instance,
        clientId: WASMO_CLIENT_ID,
        clientSecret: WASMO_CLIENT_SECRET,
      }
    })
  })

  const wasmoConfiguration = await fetch(`http://otoroshi-api.oto.tools:${otoroshi.getFirstMappedPort()}/api/globalconfig`, {
    headers: {
      "Accept": "application/json",
      "Authorization": `Basic ${btoa('admin-api-apikey-id:admin-api-apikey-secret')}`
    }
  })
    .then(r => {
      expect(r.status).toBe(200)
      return r.json();
    })
    .then(configuration => configuration.wasmoSettings);

  expect(wasmoConfiguration.url).toBe(instance);
  expect(wasmoConfiguration.clientId).toBe(WASMO_CLIENT_ID);
  expect(wasmoConfiguration.clientSecret).toBe(WASMO_CLIENT_SECRET);
});

test('/health', async () => {
  return fetch(`${instance}/health`)
    .then(r => expect(r.status).toBe(401))
});
