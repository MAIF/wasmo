const { WebSocketServer } = require('ws');

let clients = {};

function onSocketError(err) {
  console.error(err);
}

const createLogsWebSocket = server => {
  wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws, request, client) => {
    ws.on('error', onSocketError);

    clients[request.url.slice(1)] = ws;

    // ws.on('message', function message(data) {
    //   console.log(`Received message ${data} from user ${client}`);
    // });

    ws.on('close', () => {
      delete clients[request.url.slice(1)];
    })
  })

  server.on('upgrade', (request, socket, head) => {
    socket.on('error', onSocketError);

    socket.removeListener('error', onSocketError);

    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  });
}

const emit = (channel, release, message) => {
  clients[channel]?.send(`\n[${release ? "RELEASE" : "BUILD"}] ${message}`)

  if (release) {
    const socket = clients[channel];

    if (socket) {
      socket.close();

      process.nextTick(() => {
        if ([socket.OPEN, socket.CLOSING].includes(socket.readyState)) {
          socket.terminate();
        }
      });
      delete clients[channel];
    }
  }
}

const emitError = (channel, release, message) => {
  clients[channel]?.send(`\nERROR - [${release ? "RELEASE" : "BUILD"}] ${message}`)
}

module.exports = {
  WebSocket: {
    createLogsWebSocket,
    emit,
    emitError,
  }
}