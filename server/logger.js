const { createLogger, transports, format } = require("winston");
const { ENV } = require("./configuration");

const logger = createLogger({
  level: ENV.LOGGER.LEVEL,
  format: format.combine(
    format.splat(),
    format.simple()
  ),
  transports: [
    new transports.Console(),
    ENV.LOGGER.FILE ? new transports.File({ filename: 'combined.log' }) : undefined
  ].filter(f => f)
});

module.exports = logger;