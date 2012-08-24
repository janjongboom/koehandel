module.exports = function (options, imports, register) {
    var Player = function (me) {
        imports.socketio.of("/socket/" + me.name).on("connection", function(socket) {
            socket.emit("hello", me.name);
        });
    };
    
    register(null, {
        "player.websocket": Player
    });
};