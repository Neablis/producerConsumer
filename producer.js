'use strict';

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    cluster = require('cluster'),
    config = require('./config').producer,
    consumer = require('./config').consumer,
    logger = require('./logger'),
    port = null;

    console.log(logger);

if (config) {
    port = config.port
} else {
    port = 8888;
}

var options = {
    host: 'localhost',
    port: consumer.port,
    method: 'POST',
    path: '/data'
};

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function sendExpression() {
    var operation = null;

    switch (randomInt(0, 5)) {
        case 0:
            operation = "-"
            break;
        case 1:
            operation = "*";
            break;
        case 2:
            operation = "/";
            break;
        case 3:
            operation = "%";
            break;
        default:
            operation = "+";
    }

    var body = randomInt(1, 100) + operation + randomInt(1, 100) + "=";
    logger.log("Sending request " + body);

    var req = http.request(options, function(res) {
        logger.log("Recieving response " + res.statusMessage);
    });

    req.on('error', function(e) {
        logger.log("Recieving error " + e.message);
    });

    // write data to request body
    req.write(body);
    req.end();
}

sendExpression();

setInterval((function() {
    sendExpression();
}), config.rate);