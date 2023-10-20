const jwt = require('jsonwebtoken');
const { ENV } = require('../configuration');

const secret = ENV.OTOROSHI_TOKEN_SECRET || 'veryverysecret';

const missingCredentials = res => {
  res
    .status(401)
    .json({
      error: 'missing credentials'
    })
}

function extractedUserOrApikey(req) {
  const jwtUser = req.headers[ENV.OTOROSHI_USER_HEADER] || req.headers['otoroshi-user']
  if (jwtUser) {
    try {
      const decodedToken = jwt.verify(jwtUser, secret, { algorithms: ['HS512'] });
      req.user = decodedToken.user
      req.apikey = decodedToken.apikey
      return decodedToken.user || decodedToken.apikey;
    } catch (_) {
      return null;
    }
  } else {
    return null;
  }
}

const extractUserFromQuery = (req, res, next) => {
  if (ENV.AUTH_MODE === 'AUTH') {
    const jwtUser = req.headers[ENV.OTOROSHI_USER_HEADER] || req.headers['otoroshi-user']
    if (jwtUser) {
      try {
        const decodedToken = jwt.verify(jwtUser, secret, { algorithms: ['HS512'] });
        req.user = decodedToken.user
        next()
      } catch (err) {
        console.log(err)
        missingCredentials(res)
      }
    } else {
      console.log(`Missing jwt user ${jwtUser}`)
      missingCredentials(res)
    }
  } else if (ENV.AUTH_MODE === 'NO_AUTH') {
    req.user = { email: 'admin@otoroshi.io' }
    next()
  } else {
    missingCredentials(res)
  }
}

const checkCLIToken = (req, res, next) => {
  if (req.path === '/api/plugins/build') {
    if (ENV.CLI_AUTHORIZATION !== undefined && req.headers[ENV.CLI_AUTHORIZATION_HEADER.toLocaleLowerCase()] === ENV.CLI_AUTHORIZATION) {
      return next()
    } else {
      return res.status(403).json({
        error: 'invalid credentials'
      })
    }
  } else {
    return next()
  }
}

module.exports = {
  Security: {
    extractedUserOrApikey,
    extractUserFromQuery,
    checkCLIToken
  }
}