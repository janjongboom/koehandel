var assert = require("assert");
var http = require("http");
var socketio = require("socket.io");

module.exports = function (options, imports, register) {
    assert(options.host, "Option 'host' is required");
    assert(options.port, "Option 'port' is required");
    
    var server = simpleServer(options.port, options.host);
    var io = socketio.listen(server);
    
    console.log("Web-interface listening on " + options.host + ":" + options.port);
    
    register(null, {
        "socketio": io
    });
};

function simpleServer (port, host) {
    return http.createServer(function(req, res) {
        res.end("Koehandel ftw")
    }).listen(port, host);
};