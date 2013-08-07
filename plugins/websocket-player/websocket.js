var fs = require("fs");

module.exports = function (options, imports, register) {
    var Player = function (me) {
        var self = this;
        
        this.socket = null;
        
        this.init = function(ready) {
            console.log('Websocket player listening on', '/player/' + me.name);
        
            // so every player gets it's own channel in socketio
            imports.socketio.of("/player/" + me.name).on("connection", function(socket) {
                self.socket = socket;
                
                socket.emit("hello", me.name);
                
                ready();
            });
            
            imports.webserver.get("/player/" + me.name, function(req, res, next) {
                fs.readFile(__dirname + "/index.html", "utf8", function(err, data) {
                    if (err) return next(err);
                    
                    data = data.replace(/\[\%name\%\]/g, me.name);
                    
                    res.send(data);
                });
            });
        };
        
        this.emit = function(ev, data) {
            self.socket.emit(ev, data);
        };
        
        this._actionId = 0;
        /**
         * Make an action over socket
         * Callback gets called when we get message back from the user
         */
        this.action = function(evName, data, callback) {
            var id = ++self._actionId;
            
            self.socket.on("reply", function onReply(msg) {
                if (msg.id === id) {
                    self.socket.removeListener("reply", onReply);
                    callback(null, msg.data);
                }
            });
            
            data.id = id;
            data.me = {
                name: me.name,
                money: me.getMoneyCards(),
                cards: me.getCards()
            };
            
            self.socket.emit(evName, data);
        };
        
        // ===========
        // PUBLIC API
        // ===========

        /**
         * Make a bid for a card.
         * @param card {AnimalCard}
         * @param currentBid {Object} Object with { bid: {Number}, player: {Player} } or null if none
         * @param callback {Function} Invoke with bid (numeric) or falsy if pass
         */
        this.bidForCard = function(card, currentBid, callback) {
            self.action("bid-for-card", {
                card: card,
                currentBid: currentBid
            }, function(err, bid) {
                callback(bid);
            });
        };
        
        /**
         * Pass me the money!
         * @param amount {Number} The amount you have to pay
         * @param callback {Function} Invoke with an array with the money cards
         */
        this.giveMoney = function(amount, callback) {
            self.action("give-money", {
                amount: amount
            }, function(err, cards) {
                callback(cards.map(Number));
            });
        };
        
    
        /**
         * Initial question, do you want to draw a new card or deal with someone else
         * @param callback {Function} Invoke with 1 to draw or with 2 to deal
         */
        this.drawOrDeal = function (callback) {
            self.action("draw-or-deal", {}, function(err, res) {
                callback(res === "deal" ? 2 : 1);
            });
        };
        
        /**
         * Another buyer bought a card you drew, do you want to buy it yourself?
         * @param card {Card} The drawn card
         * @param highestBid {Object} Object with { bid: {Number}, player: {Player} }
         * @param callback {Function} Invoke with false or true
         */
        this.wantToBuyYourself = function (card, highestBid, callback) {
            self.action("want-to-buy-yourself", {
                card: card,
                highestBid: highestBid
            }, function(err, buy) {
                callback(buy);
            });
        };
        
        /**
         * Respond to an offer made for your card
         * @param card {Card} The card being played
         * @param offeringPlayer {Player} The player who is dealing
         * @param noOfCards {Number} The number of money cards offered
         * @param callback {Function} Invoke with money cards you offer
         */
        this.respondToOffer = function (card, offeringPlayer, noOfCards, callback) {
            self.action("respond-to-offer", {
                card: card,
                offeringPlayer: offeringPlayer,
                noOfCards: noOfCards
            }, function(err, cards) {
                callback(cards.map(Number));
            });
        };
        
        /**
         * Make an offer to another player (initial action in a deal)
         * @param players [{Player}] Array with all other players
         * @param callback {Function} Invoke with
         *      card {Card} the card you want to play
         *      targetPlayer {Player} The player you want to play
         *      bid [{Number}] Array of money cards
         */
        this.makeOfferToOtherPlayer = function (players, callback) {
            self.action("make-offer", {
                players: players
            }, function(err, obj) {
                var card = me.getCards().filter(function(card) {
                    return card.value === Number(obj.card);
                })[0];
                var targetPlayer = players.filter(function(p) {
                    return p.name === obj.player;
                })[0];
                
                callback(card, targetPlayer, obj.money.map(Number));
            });
        };
    };
    
    register(null, {
        "player.websocket": Player
    });
};