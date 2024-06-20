require('dotenv').config();

const fs = require('fs-extra');
const path = require('node:path')

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const compression = require('compression');
const bodyParser = require('body-parser');

const { ENV, AUTHENTICATION } = require('./configuration');

const pluginsRouter = require('./routers/plugins');
const templatesRouter = require('./routers/templates');
const productsTemplatesRouter = require('./routers/products_templates');
const publicRouter = require('./routers/public');
const wasmRouter = require('./routers/wasm');
const invitationRouter = require('./routers/invitation');

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

async function rewriteStaticPaths(baseURL) {
  const indexHTMLPath = path.join(__dirname, '..', 'ui/build/index.html');
  const indexHTMLContent = fs.readFileSync(indexHTMLPath).toString();
  fs.writeFileSync(indexHTMLPath,
    indexHTMLContent
      .replace(/src=((?!src=).)*?static/g, `src=\"${baseURL}/static`)
      .replace(/href=((?!src=).)*?\/static/g, `href=\"${baseURL}/static`)
      .replace(/href=((?!href=).)*?\"\/favicon/g, `href=\"${baseURL}/favicon`)
      .replace(/href=((?!href=).)*?\"\/fontawesome.min.css/g, `href=\"${baseURL}/fontawesome.min.css`)
      .replace(/src=((?!src=).)*?\"\/fontawesome.min.js/g, `href=\"${baseURL}/fontawesome.min.js`)
      .replace(/href=((?!href=).)*?\"\/solid.min.css/g, `href=\"${baseURL}/solid.min.css`)
      .replace(/src=((?!src=).)*?\"\/solid.min.js/g, `href=\"${baseURL}/solid.min.js`)
      .replace(/\/{2}/g, "/")
  );

  // media
  const directory = path.join(__dirname, "..", "ui", "build", "static", "css");
  const files = fs
    .readdirSync(directory)
    .filter(file => file.endsWith(".css"))
    .map(fileName => path.join(directory, fileName));

  for (const path of files) {
    const content = fs.readFileSync(path).toString();
    fs.writeFileSync(path, content
      .replace(/url((?!url).)*?\(\/static/g, `url=(${baseURL}/static`))
  }

  const solidHTMLPath = path.join(__dirname, '..', 'ui/build/solid.min.css');
  const solidHTMLContent = fs.readFileSync(solidHTMLPath).toString();
  fs.writeFileSync(solidHTMLPath,
    solidHTMLContent
      .replace(/url((?!url).)*?\(\/webfonts/g, `url(${baseURL}/webfonts`))

  // /api in UI folder
  const jsDirectory = path.join(__dirname, "..", "ui", "build", "static", "js");
  const jsFiles = fs
    .readdirSync(jsDirectory)
    .filter(file => file.endsWith(".js"))
    .map(fileName => path.join(jsDirectory, fileName));

  for (const path of jsFiles) {
    const content = fs.readFileSync(path).toString();
    fs.writeFileSync(path, content
      .replace(/\"\/api\"/g, `"${baseURL}/api"`)
      .replace(/"\/icon-512x512.png"/g, `"${baseURL}/icon-512x512.png"`)
      .replace(/".\/icon-512x512.png"/g, `"${baseURL}/icon-512x512.png"`))
  }

  logger.info('The baseURL has been applied')
}

function createServer(appVersion) {
  const app = express();

  let baseURL = process.env.BASE_URL;
  if (baseURL && baseURL !== "" && baseURL !== '/') {
    console.log(`loaded baseURL : ${baseURL}`)
    rewriteStaticPaths(baseURL);
  } else
    baseURL = ""

  app.use(compression());
  app.use(bodyParser.raw({
    type: 'application/octet-stream',
    limit: '10mb'
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text());

  app.use(`${baseURL}/_/healthcheck`, (_, res) => {
    return res.status(200).json()
  });

  app.use(`${baseURL}/`, Security.extractUserFromQuery);
  app.use(`${baseURL}/`, publicRouter);
  app.use(`${baseURL}/api/plugins`, pluginsRouter);
  app.use(`${baseURL}/api/templates`, templatesRouter);
  app.use(`${baseURL}/api/products_templates`, productsTemplatesRouter);
  app.use(`${baseURL}/api/wasm`, wasmRouter);
  app.use(`${baseURL}/api/version`, (_, res) => res.json(appVersion));
  app.use(`${baseURL}/api/development`, (_, res) => res.json(ENV.IS_DEV));
  app.use(`${baseURL}/api/websocket`, (_, res) => res.json(process.env.WSS === "true"));

  app.use(`${baseURL}/health`, (_, res) => res.json({ status: true }))

  app.use(`${baseURL}/api/invitations`, invitationRouter)

  if (ENV.IS_DEV)
    app.use(`${baseURL ? baseURL : '/'}`, createProxyMiddleware({
      target: 'http://127.0.0.1:3000',
      changeOrigin: true
    }));
  else {
    app.get(`${baseURL ? baseURL : '/'}`, (_, res) => res.sendFile(path.join(__dirname, '..', 'ui/build', '/index.html')));
    app.use(baseURL, express.static(path.join(__dirname, '..', 'ui/build'), { redirect: false }));
  }

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
