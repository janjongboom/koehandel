"use strict";

var argv = require('optimist').argv;

var port = Number(argv.p || process.env.PORT || 3456);
var host = argv.l || process.env.IP || "localhost";

var config = [
    {
        packagePath: "./webserver",
        port: port,
        host: host
    },
    "./console-player",
    "./websocket-player",
    "./game"
];

module.exports = config;