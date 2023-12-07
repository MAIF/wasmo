const cron = require('node-cron');
const logger = require('../logger');

const fs = require('fs-extra');
const path = require('path');
const { ENV } = require('../configuration');

const cleaningWasm = () => {
  logger.debug("[CRON-JOB]: Start cleaning wasm folder");

  const root = path.join(process.cwd(), 'wasm');

  fs.readdir(root)
    .then(files => Promise.all(files
      .filter(file => !file.includes('.gitkeep'))
      .map(file => {
        const filepath = path.join(root, file);
        return fs.stat(filepath)
          .then(data => {
            if (Date.now() - data.birthtimeMs >= ENV.LOCAL_WASM_JOB_CLEANING) {
              logger.info(`[CRON-JOB]: Remove ${filepath}`)
              fs.unlink(filepath)
            }
          })
      })))
    .then(() => {
      logger.debug("[CRON-JOB]: End cleaning");
    })

}

const initialize = () => {
  cron.schedule('*/60 * * * *', cleaningWasm);
}

module.exports = {
  Cron: {
    initialize
  }
}