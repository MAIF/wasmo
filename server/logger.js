const { createLogger, transports, format, level } = require("winston");
const { ENV } = require("./configuration");

const myFormat = format.printf(({ level, message, timestamp }) => {
  if (ENV.LOGGER.TIMESTAMP)
    return `${timestamp} ${level}: ${message}`;
  else
    return `${level}: ${message}`;
});

const logger = createLogger({
  level: ENV.LOGGER.LEVEL,
  format: format.combine(
    format.splat(),
    format.simple(),
    format.timestamp(),
    myFormat
  ),
  transports: [
    new transports.Console(),
    ENV.LOGGER.FILE ? new transports.File({ filename: 'combined.log' }) : undefined
  ].filter(f => f)
});

module.exports = logger;