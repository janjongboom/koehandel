var assert = require("assert");
var socketio = require("socket.io");

module.exports = function (options, imports, register) {
    assert(options.host, "Option 'host' is required");
    assert(options.port, "Option 'port' is required");
    
    var io = socketio.listen(options.port, options.host);
    console.log("Web-interface listening on " + options.host + ":" + options.port);
    
    register(null, {
        "socketio": io
    });
};