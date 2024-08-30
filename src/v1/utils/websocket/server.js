const http = require('http');
const WebSocketServer = require('websocket').server;
const EventEmitter = require('events');
const { webSocketPort } = require('@config/index');
const { serviceResponse } = require('../helpers/api_response');
const { _query, _response_message } = require('../constants/messages');
const { _webSocketEvents } = require('../constants');

const eventEmitter = new EventEmitter();
const clients = new Map();

const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
});

server.listen(webSocketPort, () => {
    console.log(`Websocket server is listening on port ${webSocketPort}`);
});

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});

const originIsAllowed = (origin) => {
    // Implement your logic here to check if the specified origin is allowed.
    return true;
};

wsServer.on('request', (request) => {
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log(`Connection from origin ${request.origin} rejected.`);
        return;
    }

    const connection = request.accept(null, request.origin);
    console.log(`New client connected....!`);

    // Initialize the client's subscription list
    clients.set(connection, []);

    connection.on('message', (message) => {
        if (message.type === 'utf8') {
            const parsedMessage = JSON.parse(message.utf8Data);

            if (parsedMessage.subscribe) {
                if (Object.values(_webSocketEvents).includes(parsedMessage.subscribe)) {
                    // Update the client's subscription list
                    const subscriptions = clients.get(connection);
                    subscriptions.push(parsedMessage.subscribe);
                    clients.set(connection, subscriptions);
                    connection.sendUTF(JSON.stringify(new serviceResponse({ status: 200, message: _response_message.subscribe(parsedMessage.subscribe) })));
                } else {
                    connection.sendUTF(JSON.stringify(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("event") }] })));
                }
            } else {
                // console.log(`Received message: ${message.utf8Data}`);
                connection.sendUTF(JSON.stringify(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("key") }] })));
            }
        } else if (message.type === 'binary') {
            console.log(`Received binary data of length ${message.binaryData.length}`);
            connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', (reasonCode, description) => {
        console.log(`Client disconnected: ${reasonCode} - ${description}`);
        clients.delete(connection);
    });

    connection.on('error', (error) => {
        console.error(`WebSocket error: ${error}`);
        clients.delete(connection);
    });
});

// Emit events to clients based on their subscriptions

for (const event of Object.values(_webSocketEvents)) {
    eventEmitter.on(event, (message) => {
        clients.forEach((subscriptions, connection) => {
            if (subscriptions.includes(event)) {
                connection.sendUTF(JSON.stringify(new serviceResponse({ status: 201, data: message, message: _query.get(event) })));
            }
        });
    });
}


module.exports = { wsServer, eventEmitter };
