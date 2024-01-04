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

function rewriteStaticPaths(baseURL) {
  const indexHTMLPath = path.join(__dirname, '..', 'ui/build/index.html');
  const indexHTMLContent = fs.readFileSync(indexHTMLPath).toString();
  fs.writeFileSync(indexHTMLPath,
    indexHTMLContent
      .replace(/src="(.*?)\/static/g, `src=\"${baseURL}/static`)
      .replace(/href="(.*?)\/static/g, `href=\"${baseURL}/static`)
      // .replace(/\/static/g, `${baseURL}/static`)
      .replace(/\/static\/static/g, "/static")
      .replace(/\/{2}/g, "/")
  );
  logger.info('The baseURL value has been applied')
}

function createServer(appVersion) {
  const app = express();

  let router;

  if (process.env.BASE_URL) {
    const baseURL = process.env.BASE_URL;

    console.log(`has baseURL ${baseURL}`)
    router = express.Router();

    rewriteStaticPaths(baseURL);

    app.use('/', (req, _res, next) => {
      if (!req.path.startsWith(baseURL))
        req.url = `${baseURL}${req.path}`;
      next()
    })
    app.use(baseURL, router);
  } else {
    rewriteStaticPaths("");
    router = express.Router();
    app.use('/', router);
  }

  router.use(express.static(path.join(__dirname, '..', 'ui/build')));
  router.use(compression());
  router.use(bodyParser.raw({
    type: 'application/octet-stream',
    limit: '10mb'
  }));
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.text());

  router.use('/_/healthcheck', (_, res) => {
    return res.status(200).json()
  });

  router.use('/', Security.extractUserFromQuery);
  router.use('/', publicRouter);
  router.use('/api/plugins', pluginsRouter);
  router.use('/api/templates', templatesRouter);
  router.use('/api/wasm', wasmRouter);
  router.use('/api/version', (_, res) => res.json(appVersion));
  router.use('/api/development', (_, res) => res.json(process.env.NODE_ENV === "development"));

  router.use('/health', (_, res) => res.json({ status: true }))

  router.get('/', (_, res) => res.sendFile(path.join(__dirname, '..', 'ui/build', '/index.html')));

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
