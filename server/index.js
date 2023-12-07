require('dotenv').config();

const fs = require('fs-extra');
const path = require('path')
const express = require('express');
const http = require('http');
const compression = require('compression');
const bodyParser = require('body-parser');

const { ENV, AUTHENTICATION } = require('./configuration');

const pluginsRouter = require('./routers/plugins');
const templatesRouter = require('./routers/templates');
const publicRouter = require('./routers/public');
const wasmRouter = require('./routers/wasm');

const { WebSocket } = require('./services/websocket');
const { FileSystem } = require('./services/file-system');
const { Security } = require('./security/middlewares');

const Datastore = require('./datastores');

const logger = require('./logger');
const { Cron } = require('./services/cron-job');

if (ENV.AUTH_MODE === AUTHENTICATION.NO_AUTH) {
  console.log("###############################################################")
  console.log("#                                                             #")
  console.log('# ⚠The manager will start without authentication configured⚠  #')
  console.log("#                                                             #")
  console.log("###############################################################")
}

if (AUTHENTICATION.BASIC_AUTH === ENV.AUTH_MODE &&
  (!ENV.WASMO_CLIENT_ID ||
    !ENV.WASMO_CLIENT_SECRET)) {
  console.log("#############################################################")
  console.log("#                                                           #")
  console.log('# WASMO_CLIENT_ID or WASMO_CLIENT_SECRET is missing⚠ #')
  console.log("#                                                           #")
  console.log("#############################################################")

  return;
}

function createServer(appVersion) {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'ui/build')));
  app.use(compression());
  app.use(bodyParser.raw({
    type: 'application/octet-stream',
    limit: '10mb'
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text());

  app.use('/_/healthcheck', (_, res) => {
    return res.status(200).json()
  });

  app.use('/', Security.extractUserFromQuery);
  app.use('/', publicRouter);
  app.use('/api/plugins', pluginsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/wasm', wasmRouter);
  app.use('/api/version', (_, res) => res.json(appVersion));
  app.use('/api/development', (_, res) => res.json(process.env.NODE_ENV === "development"));

  app.use('/health', (_, res) => res.json({ status: true }))

  app.get('/', (_, res) => res.sendFile(path.join(__dirname, '..', 'ui/build', '/index.html')));

  return http.createServer(app);
}

function getAppVersion() {
  return fs.readFile(path.join(process.cwd(), "package.json"))
    .then(file => JSON.parse(file))
    .then(file => file.version);
}

Promise.all([Datastore.initialize(), getAppVersion()])
  .then(([error, version]) => {
    if (error) {
      throw error;
    }

    FileSystem.cleanBuildsAndLogsFolders();
    Datastore.cleanJobs();

    Cron.initialize();

    const server = createServer(version);

    WebSocket.createLogsWebSocket(server);

    server.listen(ENV.PORT, () => logger.info(`Wasmo ${version}, listening on ${ENV.PORT}`));
  });
