module.exports = function (options, imports, register) {
    register(null, {
        "player.console": Player
    });
};

/**
 * Console player
 * @ctor
 * @param me {Player} You, the player
 */ 
var Player = function (me) {
    /**
     * Make a bid for a card.
     * @param card {AnimalCard}
     * @param currentBid {Object} Object with { bid: {Number}, player: {Player} } or null if none
     * @param callback {Function} Invoke with bid (numeric) or falsy if pass
     */
    this.bidForCard = function (card, currentBid, callback) {
        // a card is presented with the question whether we want to bid for it
        var cb = function (v) {
            callback(v && Number(v));
        };
        
        var v = "Bid for " + card.name + " (" + card.value + ")";
        if (currentBid) {
            this.ask(v + ". Highest bid is " + currentBid.bid + " by " + currentBid.player.name, cb);
        }
        else {
            this.ask(v, cb);
        }
    };
    
    /**
     * Pass me the money!
     * @param amount {Number} The amount you have to pay
     * @param callback {Function} Invoke with an array with the money cards
     */
    this.giveMoney = function (amount, callback) {
        // so we can either ask a new question or just calculate it...
        // as little cards as possible
        var allCombis = powerset(me.getMoneyCards().filter(function (m) {
            return m > 0;
        }));
        
        var closest = null;
        var deltaClosest = 10000;
        
        var combis = allCombis.filter(function (c) {
            var sum = 0;
            for (var ix = 0; ix < c.length; ix++) {
                sum += c[ix];
            }
            
            var delta = sum - amount > 0 ? sum - amount : 10000;
            if (delta < deltaClosest) {
                closest = c;
                deltaClosest = delta;
            }
            
            return sum === amount;
        });
        
        var choseArr = combis.sort(function (c1, c2) {
            return c1.length > c2.length ? 1 : (c1.length === c2.length ? 0 : -1);
        });
        
        callback(choseArr.length ? choseArr[0] : closest);
    };
    
    /**
     * Another buyer bought a card you drew, do you want to buy it yourself?
     * @param card {Card} The drawn card
     * @param highestBid {Object} Object with { bid: {Number}, player: {Player} }
     * @param callback {Function} Invoke with false or true
     */
    this.wantToBuyYourself = function (card, highestBid, callback) {
        var question =
            highestBid.player.name + " bought a " + card.name + " from you for " + highestBid.bid + ". " +
            "Do you want to buy it instead?";
            
        this.ask(question, function (answer) {
            // dont wanna buy?
            if (!answer || answer.toLowerCase() === "n") {
                return callback(false);
            }
            
            // otherwise say YES
            callback(true);
        });
    };
    
    /**
     * Initial question, do you want to draw a new card or deal with someone else
     * @param callback {Function} Invoke with 1 to draw or with 2 to deal
     */
    this.drawOrDeal = function (callback) {
        this.ask("Do you want to [1] draw a card, or [2] deal with player", function (res) {
            callback(Number(res || 1));
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
        var self = this;
        
        var cardText = me.getCards()
            .filter(function (el, i, a) { return i === a.indexOf(el) ? 1 : 0; })
            .map(function (c) {
                return "[" + c.value + "] " + c.name;
            })
            .join(", ");
        
        var playerText = players
            .map(function (p, ix) {
                return "[" + ix + "] " + p.name;
            })
            .join(", ");
        
        var cardsText = me.getMoneyCards().join(", ");
        
        self.ask("Which card do you want to deal? " + cardText, function (res) {
            var card = me.getCards().filter(function (c) {
                return c.value === Number(res);
            })[0];
            
            self.ask("Which player do you want to play? " + playerText, function (res) {
                var targetPlayer = players[Number(res)];
                
                self.ask("Which money cards do you play? " + cardsText, function (res) {
                    var cards = res.split(" ").map(function (c) { return Number(c); });
                    
                    callback(card, targetPlayer, cards);
                });
            });
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
        var question = "Player " + offeringPlayer.name + " offers " + noOfCards + 
            " for your " + card.name + ". Which cards do you play? " + me.getMoneyCards().join(", ");
        
        this.ask(question, function (res) {
            callback(res.split(" ").map(function (c) { return Number(c); }));
        });
    };
    
    /**
     * Ask something on standard in
     */
    this.ask = function (question, callback) {
        var stdin = process.stdin,
            stdout = process.stdout;
        
        stdin.resume();
        stdout.write("Player " + me.name + " (" + me.getTotalMoney() + ") " + question + ": ");
        
        stdin.once('data', function(data) {
            data = data.toString().trim();
        
            callback(data);
        });
    };
    
    function powerset(ary) {
        var ps = [[]];
        for (var i=0; i < ary.length; i++) {
            for (var j = 0, len = ps.length; j < len; j++) {
                ps.push(ps[j].concat(ary[i]));
            }
        }
        return ps;
    }
};