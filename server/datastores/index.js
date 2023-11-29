const { STORAGE, ENV } = require('../configuration');
const Datastore = require('./api');

const S3Datastore = require('./s3');

/** @type {Datastore} */
let datastore;

if ([STORAGE.S3, STORAGE.DOCKER_S3].includes(ENV.STORAGE)) {
    datastore = new S3Datastore();
} else if (ENV.STORAGE === STORAGE.LOCAL) {

}

/** @type {Datastore} */
module.exports = datastore;