const { GenericContainer, Network } = require("testcontainers");

let instance;
let container;

const WASMO_CLIENT_ID = "id";
const WASMO_CLIENT_SECRET = "secret";

beforeAll(async () => {
  const network = await new Network().start();

  container = await new GenericContainer("wasmo")
    .withNetwork(network)
    .withNetworkAliases("foo")
    .withExposedPorts(5003)
    .withEnvironment({
      MANAGER_PORT: 5003,
      AUTH_MODE: "BASIC_AUTH",
      CHECK_DOMAINS: false,
      STORAGE: 'test',
      WASMO_CLIENT_ID,
      WASMO_CLIENT_SECRET
    })
    .start()
    .catch(err => console.log(err))

  instance = `http://localhost:${container.getFirstMappedPort()}`;

  await new Promise(resolve => {
    setTimeout(resolve, 10000);
  })
}, 60000);

test('/health', async () => {
  return fetch(`${instance}/health`)
    .then(r => expect(r.status).toBe(401))
});

test('/health', async () => {
  return fetch(`${instance}/health`, {
    headers: {
      'Authorization': `Basic ${btoa(`${WASMO_CLIENT_ID}:${WASMO_CLIENT_SECRET}`)}`
    }
  })
    .then(r => expect(r.status).toBe(200))
});
