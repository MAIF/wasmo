const stream = require('stream');

class CustomStream extends stream.Writable {
    constructor() {
        super({ objectMode: true });
    }

    chunks = []

    _write = function (chunk, encoding, done) {
        this.chunks.push(Buffer.from(chunk));
        done();
    }

    contents = () => Buffer.concat(this.chunks).toString('utf8')
}


module.exports = CustomStream