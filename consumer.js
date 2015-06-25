'use strict';

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    cluster = require('cluster'),
    qs = require('querystring'),
    config = require('./config').consumer,
    logger = require('./logger.js'),
    port = null;

if (config) {
    port = config.port
} else {
    port = 8888;
}

//We need a function which handles requests and send response
function handleRequest(request, response) {
    if (request.method === "GET") {
        return response.end();
    } else if (request.method === "POST") {
        if (request.url === "/data") {
            var requestBody = '';
            request.on('data', function(data) {
                requestBody += data;
                if (requestBody.length > 1e7) {
                    response.statusCode = 413;
                    response.statusMessage = "Request entity Too Large";
                    return response.end();
                }
            });
            request.on('end', function() {
                logger.log("Recieved Post with body: " + requestBody);

                var responseText = evaluatePost(requestBody);
                response.statusCode = 200;
                response.statusMessage = responseText;

                logger.log("Sending response with body: " + responseText);
                return response.end();
            });
        } else {
            response.statusCode = 404;
            response.statusMessage = "Resource Not Found";
            return response.end();
        }
    } else {
        response.statusCode = 405;
        response.statusMessage = "Method not found";
        return response.end();
    }
}

var evaluatePost = function(expression) {
    var response = null;
    var operation = null;

    if (expression.indexOf("-") !== -1) {
        operation = "-";
        expression = expression.substring(0, expression.length - 1).split("-");
    } else if (expression.indexOf("*") !== -1) {
        operation = "*";
        expression = expression.substring(0, expression.length - 1).split("*");
    } else if (expression.indexOf("/") !== -1) {
        operation = "/";
        expression = expression.substring(0, expression.length - 1).split("/");
    } else if (expression.indexOf("%") !== -1) {
        operation = "%";
        expression = expression.substring(0, expression.length - 1).split("%");
    } else {
        operation = "+";
        expression = expression.substring(0, expression.length - 1).split("+");
    }

    if (expression.length != 2) {
        return undefined;
    }

    switch (operation) {
        case '-':
            response = parseInt(expression[0], 10) - parseInt(expression[1], 10);
            break;
        case '*':
            response = parseInt(expression[0], 10) * parseInt(expression[1], 10);
            break;
        case '/':
            response = parseInt(expression[0], 10) / parseInt(expression[1], 10);
            break;
        case '%':
            response = parseInt(expression[0], 10) % parseInt(expression[1], 10);
            break;
        default:
            response = parseInt(expression[0], 10) + parseInt(expression[1], 10);
    }

    return response;
};


if (cluster.isMaster) {
    logger.log("Starting master");

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    logger.log("Starting " + cpuCount + " services");

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    cluster.fork();

    cluster.on('exit', function(worker) {

        // Replace the dead worker,
        // we're not sentimental
        logger.log("Worker " + worker.id + " has died, trying to restart");
        cluster.fork();
    });

    // Code to run if we're in a worker process
} else {
    logger.log("Starting up a child");
    //Create a server
    var server = http.createServer(handleRequest);

    //Lets start our server
    server.listen(port, function() {
        //Callback triggered when server is successfully listening. Hurray!
        logger.log(config.name + " listening on: http://localhost:" + port);
    });
}