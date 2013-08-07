var assert = require("assert");
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

module.exports = function(options, imports, register) {
  assert(options.host, "Option 'host' is required");
  assert(options.port, "Option 'port' is required");

  app.get("/", function(req, res, next) {
    res.send("Koehandel ftw");
  });

  server.listen(options.port, options.host);

  console.log("Web-interface listening on " + options.host + ":" + options.port);

  register(null, {
    "socketio": io,
    "webserver": app
  });
};