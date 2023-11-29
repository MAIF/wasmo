const jwt = require('jsonwebtoken');
const { ENV, AUTHENTICATION } = require('../configuration');

const secret = ENV.OTOROSHI_TOKEN_SECRET || 'veryverysecret';

const missingCredentials = res => {
  res
    .status(401)
    .json({
      error: 'missing credentials'
    })
}
const otoroshiAuthentication = (req, res, next) => {
  const jwtUser = req.headers[ENV.OTOROSHI_USER_HEADER] || req.headers['otoroshi-user'];
  if (jwtUser) {
    try {
      const decodedToken = jwt.verify(jwtUser, secret, { algorithms: ['HS512'] });
      req.user = decodedToken.user || decodedToken.apikey.clientId
      next()
    } catch (err) {
      console.log(err)
      missingCredentials(res)
    }
  } else {
    console.log(`Missing jwt user`, jwtUser)
    missingCredentials(res)
  }
}

const checkApikey = (header) => {
  const [clientId, clientSecret] = header.split(':');
  return clientId === ENV.WASMO_CLIENT_ID &&
    clientSecret === ENV.WASMO_CLIENT_SECRET;
}

const extractUserFromQuery = (req, res, next) => {
  if (ENV.AUTH_MODE === AUTHENTICATION.NO_AUTH) {
    req.user = { email: 'admin@otoroshi.io' }
    next()
  } else if (ENV.AUTH_MODE === AUTHENTICATION.OTOROSHI) {
    otoroshiAuthentication(req, res, next);
  } else if (ENV.AUTH_MODE === AUTHENTICATION.BASIC_AUTH) {
    if (req.headers.authorization && checkApikey(atob(req.headers.authorization.replace('Basic ', '')))) {
      req.user = { email: 'admin@otoroshi.io' }
      next()
    }
    else {
      return res
        .status(401)
        .set("WWW-Authenticate", "Basic realm='wasmo'")
        .json();
    }
  } else {
    missingCredentials(res)
  }
}

module.exports = {
  Security: {
    extractUserFromQuery
  }
}